'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CartIcon } from '@/components/cart/CartIcon'
import { useAuthStore } from '@/lib/stores/authStore'

export function Header() {
  const { user, isAuthenticated } = useAuthStore()

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              🛒 E-Commerce Platform
            </h1>
            <span className="ml-3 text-sm text-gray-500">Burkina Faso</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/products" className="text-gray-700 hover:text-blue-600 transition-colors">
              Produits
            </Link>
            <Link href="/categories" className="text-gray-700 hover:text-blue-600 transition-colors">
              Catégories
            </Link>
            {isAuthenticated && user?.role === 'vendor' && (
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 transition-colors">
                Dashboard
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Cart Icon */}
            <CartIcon />

            {/* Auth Buttons */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700">
                  Bonjour, {user?.profile?.firstName || 'Utilisateur'}
                </span>
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">
                    Mon Compte
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Connexion
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
                    S&apos;inscrire
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4">
          <div className="flex justify-center space-x-4">
            <Link href="/products">
              <Button variant="ghost" size="sm">
                Produits
              </Button>
            </Link>
            <Link href="/categories">
              <Button variant="ghost" size="sm">
                Catégories
              </Button>
            </Link>
            {isAuthenticated && user?.role === 'vendor' && (
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header