import { useEffect } from 'react'
import { useAuth, useAuthActions } from '@/lib/stores/authStore'

export function useAuthHook() {
  const auth = useAuth()
  const actions = useAuthActions()

  // Load user on mount if tokens exist
  useEffect(() => {
    if (!auth.isAuthenticated && !auth.isLoading) {
      actions.loadUser()
    }
  }, [auth.isAuthenticated, auth.isLoading, actions])

  return {
    ...auth,
    ...actions,
  }
}

export { useAuth, useAuthActions }
export default useAuthHook