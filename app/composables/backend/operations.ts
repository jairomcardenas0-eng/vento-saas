import type { CatalogCoupon, CatalogRecord } from '~/types/catalog'
import type { TeamMemberPayload } from './types'
import type {
  BackendSupabaseClient,
  CatalogHeaderRow,
  CouponRow,
  EnsureSuccess,
  ReferralRow,
  TeamMemberRow,
} from './types'
import { normalizeTeamPermissions } from '~/utils/adminAccess'

const PLAN_LIMITS = {
  free: { maxTeamMembers: 2 },
  basic: { maxTeamMembers: 5 },
  pro: { maxTeamMembers: 15 },
  enterprise: { maxTeamMembers: Number.POSITIVE_INFINITY },
} as const

const normalizePlanTier = (planType?: string | null): keyof typeof PLAN_LIMITS => {
  if (planType === 'basic' || planType === 'pro' || planType === 'enterprise') {
    return planType
  }

  return 'free'
}

interface CreateSupabaseOperationsBackendOptions {
  supabase: BackendSupabaseClient
  ensureSuccess: EnsureSuccess
  couponSelect: string
  catalogSelect: string
  mapRowToCoupon: (row: CouponRow) => CatalogCoupon
  mapCouponToRow: (catalogId: string, coupon: CatalogCoupon) => Record<string, unknown>
  mapRowToCatalogRecord: (
    row: CatalogHeaderRow,
    categories: CatalogRecord['categories'],
    products: CatalogRecord['products'],
    reviews: CatalogRecord['reviews'],
    orders: CatalogRecord['orders'],
  ) => CatalogRecord
}

const mapTeamMemberRow = (row: TeamMemberRow) => ({
  id: row.id,
  catalogId: row.catalog_id,
  email: row.email,
  name: row.name,
  role: row.role,
  permissions: normalizeTeamPermissions(row.permissions || {}),
  status: row.status,
  invitedBy: row.invited_by || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const createSupabaseOperationsBackend = ({
  supabase,
  ensureSuccess,
  couponSelect,
  catalogSelect,
  mapRowToCoupon,
  mapCouponToRow,
  mapRowToCatalogRecord,
}: CreateSupabaseOperationsBackendOptions) => {
  const ensureReferralCode = async (uid: string): Promise<string> => {
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('referral_code')
      .eq('uid', uid)
      .maybeSingle()

    if (existing?.referral_code) {
      return existing.referral_code
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const prefix = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const suffix = uid.replace(/-/g, '').slice(0, 5).toUpperCase()
    const code = `${prefix}${suffix}`

    const { error } = await supabase
      .from('user_profiles')
      .update({ referral_code: code })
      .eq('uid', uid)

    ensureSuccess(error, 'No se pudo generar el codigo de referido')
    return code
  }

  return {
    async getCoupons(catalogId: string) {
      const { data, error } = await supabase
        .from('coupons')
        .select(couponSelect)
        .eq('catalog_id', catalogId)
        .order('created_at', { ascending: false })

      ensureSuccess(error, 'No se pudieron cargar los cupones')
      return ((data || []) as unknown as CouponRow[]).map(mapRowToCoupon)
    },
    watchCoupons(catalogId: string, callback: (coupons: CatalogCoupon[]) => void, onError?: (error: Error) => void) {
      const fetchCoupons = async () => {
        const { data, error } = await supabase
          .from('coupons')
          .select(couponSelect)
          .eq('catalog_id', catalogId)
          .order('created_at', { ascending: false })

        if (error) {
          throw error
        }

        callback(((data || []) as unknown as CouponRow[]).map(mapRowToCoupon))
      }

      fetchCoupons().catch((error) => onError?.(error as Error))

      const channel = supabase
        .channel(`coupons:${catalogId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons', filter: `catalog_id=eq.${catalogId}` }, async () => {
          try {
            await fetchCoupons()
          } catch (error) {
            onError?.(error as Error)
          }
        })
        .subscribe()

      return () => {
        void supabase.removeChannel(channel)
      }
    },
    async upsertCoupon(catalogId: string, coupon: CatalogCoupon) {
      const { error } = await supabase.from('coupons').upsert(mapCouponToRow(catalogId, coupon))
      ensureSuccess(error, 'No se pudo guardar el cupon')
    },
    async deleteCoupon(catalogId: string, couponId: string) {
      const { error } = await supabase.from('coupons').delete().eq('catalog_id', catalogId).eq('id', couponId)
      ensureSuccess(error, 'No se pudo eliminar el cupon')
    },
    async getTeamMembers(catalogId: string) {
      const { data, error } = await supabase
        .from('catalog_team_members')
        .select('id, catalog_id, email, name, role, permissions, status, invited_by, created_at, updated_at')
        .eq('catalog_id', catalogId)
        .order('created_at', { ascending: false })

      ensureSuccess(error, 'No se pudo cargar el equipo')
      return ((data || []) as unknown as TeamMemberRow[]).map(mapTeamMemberRow)
    },
    async saveTeamMember(payload: TeamMemberPayload) {
      if (!payload.id) {
        const [{ data: catalogRow, error: catalogError }, { count: membersCount, error: membersError }] = await Promise.all([
          supabase.from('catalogs').select('plan_tier').eq('id', payload.catalogId).maybeSingle(),
          supabase.from('catalog_team_members').select('id', { count: 'exact', head: true }).eq('catalog_id', payload.catalogId),
        ])

        ensureSuccess(catalogError, 'No se pudo validar el plan del catalogo')
        ensureSuccess(membersError, 'No se pudo validar el limite de miembros')

        const maxTeamMembers = PLAN_LIMITS[normalizePlanTier(catalogRow?.plan_tier)].maxTeamMembers
        const nextMembersCount = Number(membersCount || 0) + 1
        if (Number.isFinite(maxTeamMembers) && nextMembersCount > maxTeamMembers) {
          throw new Error('Has alcanzado el limite de miembros de tu plan. Actualiza para invitar mas.')
        }
      }

      const row = {
        catalog_id: payload.catalogId,
        email: payload.email.trim().toLowerCase(),
        name: payload.name.trim(),
        role: payload.role,
        status: payload.status,
        permissions: payload.permissions,
        invited_by: payload.invitedBy || null,
        updated_at: new Date().toISOString(),
      }

      if (payload.id) {
        const { data, error } = await supabase
          .from('catalog_team_members')
          .update(row)
          .eq('id', payload.id)
          .select('id, catalog_id, email, name, role, permissions, status, invited_by, created_at, updated_at')
          .single()

        ensureSuccess(error, 'No se pudo actualizar el miembro')
        if (!data) {
          throw new Error('No se recibio el miembro actualizado')
        }
        return mapTeamMemberRow(data as TeamMemberRow)
      }

      const { data, error } = await supabase
        .from('catalog_team_members')
        .insert(row)
        .select('id, catalog_id, email, name, role, permissions, status, invited_by, created_at, updated_at')
        .single()

      ensureSuccess(error, 'No se pudo crear el miembro')
      if (!data) {
        throw new Error('No se recibio el miembro creado')
      }
      return mapTeamMemberRow(data as TeamMemberRow)
    },
    async deleteTeamMember(memberId: string) {
      const { error } = await supabase.from('catalog_team_members').delete().eq('id', memberId)
      ensureSuccess(error, 'No se pudo eliminar el miembro')
    },
    async hydrateCatalogList(catalogIds: string[]) {
      if (!catalogIds.length) {
        return []
      }

      const { data, error } = await supabase.from('catalogs').select(catalogSelect).in('id', catalogIds)
      ensureSuccess(error, 'No se pudieron hidratar los catalogos')

      return ((data || []) as unknown as CatalogHeaderRow[]).map((row) => mapRowToCatalogRecord(row, [], [], [], []))
    },
    ensureReferralCode,
    async linkReferral(newUserUid: string, referralCode: string): Promise<void> {
      if (!referralCode) {
        return
      }

      const { data: referrerData } = await supabase
        .rpc('get_uid_by_referral_code', { code: referralCode.toUpperCase() })

      if (!referrerData || referrerData === newUserUid) {
        return
      }

      await supabase
        .from('user_profiles')
        .update({ referred_by: referrerData })
        .eq('uid', newUserUid)

      await supabase
        .from('referrals')
        .upsert({
          referrer_uid: referrerData,
          referred_uid: newUserUid,
          status: 'active',
        }, { onConflict: 'referrer_uid,referred_uid', ignoreDuplicates: true })
    },
    async getReferralData(uid: string): Promise<{
      code: string
      referrals: Array<{ uid: string; displayName: string; email: string; createdAt: string; status: string }>
      total: number
    }> {
      const code = await ensureReferralCode(uid)

      const { data, error } = await supabase
        .from('referrals')
        .select('referred_uid, status, created_at, user_profiles!referrals_referred_uid_fkey(display_name, email)')
        .eq('referrer_uid', uid)
        .order('created_at', { ascending: false })

      ensureSuccess(error, 'No se pudieron cargar los referidos')

      const referrals = ((data || []) as ReferralRow[]).map((row) => {
        const joinedProfile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : null
        return {
          uid: row.referred_uid,
          displayName: joinedProfile?.display_name || 'Sin nombre',
          email: joinedProfile?.email || '',
          createdAt: row.created_at,
          status: row.status,
        }
      })

      return { code, referrals, total: referrals.length }
    },
  }
}
