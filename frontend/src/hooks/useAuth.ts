import { useEffect } from 'react'
import { useAuthStore, useAuth, useAuthActions } from '@/lib/stores/authStore'

export function useAuthHook() {
  const auth = useAuth()
  const actions = useAuthActions()

  // Load user on mount if tokens exist
  useEffect(() => {
    if (!auth.isAuthenticated && !auth.isLoading) {
      actions.loadUser()
    }
  }, [])

  return {
    ...auth,
    ...actions,
  }
}

export { useAuth, useAuthActions }
export default useAuthHook