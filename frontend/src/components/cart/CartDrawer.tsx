'use client'

import { useCart, useCartActions } from '@/lib/stores/cartStore'
import { Button } from '@/components/ui/button'
import { CartItemComponent } from './CartItem'
import Link from 'next/link'

// Format CFA Franc currency
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(price)
}

export function CartDrawer() {
  const { items, isOpen, totals } = useCart()
  const { closeCart, clearCart } = useCartActions()

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={closeCart}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              🛒 Mon Panier ({totals.itemCount})
            </h2>
            <Button variant="ghost" size="sm" onClick={closeCart}>
              ✕
            </Button>
          </div>

          {/* Content */}
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Votre panier est vide
              </h3>
              <p className="text-gray-600 mb-6">
                Découvrez nos produits et ajoutez-les à votre panier
              </p>
              <Link href="/products">
                <Button onClick={closeCart}>
                  Découvrir nos produits
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {items.map((item) => (
                  <CartItemComponent key={item.id} item={item} />
                ))}
              </div>

              {/* Totals */}
              <div className="border-t p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sous-total</span>
                  <span>{formatPrice(totals.subtotal)}</span>
                </div>
                
                {totals.shipping > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Livraison</span>
                    <span>{formatPrice(totals.shipping)}</span>
                  </div>
                )}
                
                {totals.shipping === 0 && totals.subtotal > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Livraison</span>
                    <span>Gratuite! 🎉</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span>TVA (5%)</span>
                  <span>{formatPrice(totals.tax)}</span>
                </div>
                
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{formatPrice(totals.total)}</span>
                </div>
                
                {totals.subtotal < 50000 && (
                  <p className="text-xs text-gray-600 text-center">
                    Livraison gratuite à partir de {formatPrice(50000)}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 space-y-2 border-t">
                <Link href="/checkout" className="block">
                  <Button className="w-full" size="lg">
                    Procéder au paiement
                  </Button>
                </Link>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCart}
                    className="flex-1"
                  >
                    Vider le panier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={closeCart}
                    className="flex-1"
                  >
                    Continuer les achats
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default CartDrawer