export const useAuth = () => {
  const backend = useSupabaseBackend()

  const registerAdmin = async (email: string, password: string, displayName = 'Admin') => {
    return backend.register(displayName, email, password)
  }

  return { registerAdmin }
}
