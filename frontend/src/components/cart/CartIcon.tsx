'use client'

import { useCart, useCartActions } from '@/lib/stores/cartStore'
import { Button } from '@/components/ui/button'

export function CartIcon() {
  const { itemCount } = useCart()
  const { toggleCart } = useCartActions()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleCart}
      className="relative flex items-center gap-2"
    >
      <span className="text-lg">🛒</span>
      <span className="hidden sm:inline">Panier</span>
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Button>
  )
}

export default CartIcon