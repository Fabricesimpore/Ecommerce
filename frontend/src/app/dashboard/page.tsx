'use client'

import { useEffect } from 'react'
import { useAuthHook } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuthHook()

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/login'
    }
  }, [isAuthenticated, isLoading])

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Welcome, {user.profile.firstName} {user.profile.lastName}!
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* User Info Card */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Account Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">Email:</span> {user.email}</p>
                  <p><span className="font-medium">Phone:</span> {user.phone}</p>
                  <p><span className="font-medium">Role:</span> {user.role}</p>
                  <p><span className="font-medium">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      user.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Verification Status */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Verification Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className={user.verification.email ? 'text-green-600' : 'text-red-600'}>
                      {user.verification.email ? '✅ Verified' : '❌ Not verified'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span className={user.verification.phone ? 'text-green-600' : 'text-red-600'}>
                      {user.verification.phone ? '✅ Verified' : '❌ Not verified'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Identity:</span>
                    <span className={user.verification.identity ? 'text-green-600' : 'text-red-600'}>
                      {user.verification.identity ? '✅ Verified' : '❌ Not verified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Quick Actions</h3>
                <div className="space-y-2">
                  {user.role === 'buyer' && (
                    <>
                      <Button className="w-full" size="sm">Browse Products</Button>
                      <Button className="w-full" variant="outline" size="sm">View Orders</Button>
                    </>
                  )}
                  {user.role === 'vendor' && (
                    <>
                      <Button className="w-full" size="sm">Add Product</Button>
                      <Button className="w-full" variant="outline" size="sm">Manage Inventory</Button>
                    </>
                  )}
                  {user.role === 'driver' && (
                    <>
                      <Button className="w-full" size="sm">View Deliveries</Button>
                      <Button className="w-full" variant="outline" size="sm">Update Status</Button>
                    </>
                  )}
                  <Button className="w-full" variant="outline" size="sm">Edit Profile</Button>
                </div>
              </div>
            </div>

            {/* Business Info for Vendors */}
            {user.role === 'vendor' && user.profile.businessName && (
              <div className="mt-6 border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Business Information</h3>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Business Name:</span> {user.profile.businessName}
                </p>
                {user.verification.businessLicense && (
                  <p className="text-sm text-green-600 mt-2">
                    ✅ Business license verified
                  </p>
                )}
              </div>
            )}

            {/* Debug Info (development only) */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Debug: User Data (development only)
                </summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}