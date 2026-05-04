interface TouchGestureOptions {
  onPullRefresh?: () => Promise<void> | void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onLongPress?: () => void
  pullThreshold?: number
  swipeThreshold?: number
  longPressMs?: number
}

/**
 * Gestos tactiles ligeros para Android de gama baja: pull, swipe y long press.
 */
export const useTouchGestures = (target: Ref<HTMLElement | null>, options: TouchGestureOptions) => {
  let startX = 0
  let startY = 0
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  const pullThreshold = options.pullThreshold ?? 72
  const swipeThreshold = options.swipeThreshold ?? 64
  const longPressMs = options.longPressMs ?? 520

  const haptic = (duration = 12) => {
    if (import.meta.client && 'vibrate' in navigator) {
      navigator.vibrate(duration)
    }
  }

  const clearLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0]
    if (!touch) return
    startX = touch.clientX
    startY = touch.clientY
    clearLongPress()
    longPressTimer = setTimeout(() => {
      options.onLongPress?.()
      haptic(18)
    }, longPressMs)
  }

  const onTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0]
    if (!touch) return
    if (Math.abs(touch.clientX - startX) > 12 || Math.abs(touch.clientY - startY) > 12) {
      clearLongPress()
    }
  }

  const onTouchEnd = (event: TouchEvent) => {
    clearLongPress()
    const touch = event.changedTouches[0]
    if (!touch) return
    const deltaX = touch.clientX - startX
    const deltaY = touch.clientY - startY

    if (deltaY > pullThreshold && Math.abs(deltaX) < 32 && window.scrollY <= 2) {
      haptic()
      void options.onPullRefresh?.()
      return
    }

    if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaY) < 40) {
      haptic()
      if (deltaX < 0) options.onSwipeLeft?.()
      else options.onSwipeRight?.()
    }
  }

  onMounted(() => {
    const element = target.value
    if (!element) return
    element.addEventListener('touchstart', onTouchStart, { passive: true })
    element.addEventListener('touchmove', onTouchMove, { passive: true })
    element.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    const element = target.value
    clearLongPress()
    if (!element) return
    element.removeEventListener('touchstart', onTouchStart)
    element.removeEventListener('touchmove', onTouchMove)
    element.removeEventListener('touchend', onTouchEnd)
  })

  return { haptic }
}
