'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CartItem, useCartActions } from '@/lib/stores/cartStore'

interface CartItemProps {
  item: CartItem
}

// Format CFA Franc currency
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(price)
}

export function CartItemComponent({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartActions()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleQuantityChange = async (newQuantity: number) => {
    setIsUpdating(true)
    try {
      updateQuantity(item.id, newQuantity)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemove = () => {
    removeItem(item.id)
  }

  const mainImage = item.product.images?.find(img => img.isMain) || item.product.images?.[0]
  const itemTotal = item.product.price * item.quantity

  return (
    <div className="flex gap-3 p-3 border rounded-lg bg-gray-50">
      {/* Product Image */}
      <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden rounded bg-gray-100">
        {mainImage ? (
          <Image
            src={mainImage.url}
            alt={mainImage.altText || item.product.name || item.product.description}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-2xl">
            📦
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <Link href={`/products/${item.product.id}`}>
          <h4 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2 hover:text-blue-600 transition-colors">
            {item.product.name || item.product.description}
          </h4>
        </Link>
        
        <p className="text-xs text-gray-600 mb-2">
          {formatPrice(item.product.price)} / unité
        </p>

        {/* Quantity Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={isUpdating || item.quantity <= 1}
              className="h-6 w-6 p-0 text-xs"
            >
              −
            </Button>
            
            <span className="text-sm font-medium w-8 text-center">
              {item.quantity}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={isUpdating}
              className="h-6 w-6 p-0 text-xs"
            >
              +
            </Button>
          </div>

          {/* Remove Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            🗑️
          </Button>
        </div>

        {/* Item Total */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">
            {item.product.category}
          </span>
          <span className="font-semibold text-sm">
            {formatPrice(itemTotal)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default CartItemComponent