'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Product } from '@/lib/api/products'
import { useCartActions } from '@/lib/stores/cartStore'

interface ProductCardProps {
  product: Product
}

// Format CFA Franc currency
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(price)
}

export function ProductCard({ product }: ProductCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { addItem, openCart, isInCart } = useCartActions()

  const handleAddToCart = async () => {
    setIsLoading(true)
    try {
      addItem(product)
      // Show a brief success state then open cart
      setTimeout(() => {
        openCart()
      }, 500)
    } catch (error) {
      console.error('Failed to add to cart:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const productInCart = isInCart(product.id)

  const mainImage = product.images?.find(img => img.isMain) || product.images?.[0]
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price

  return (
    <div className="group relative bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-100">
        {mainImage ? (
          <Image
            src={mainImage.url}
            alt={mainImage.altText || product.name || product.description}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-4xl">📦</div>
          </div>
        )}
        
        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            PROMO
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
          {product.category}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Product Name/Description */}
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
            {product.title || product.name || product.description}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-500 line-through">
              {formatPrice(product.compareAtPrice!)}
            </span>
          )}
        </div>

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
            {product.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{product.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Inventory Status */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">
            {product.inventory.quantity === null ? (
              'Stock disponible'
            ) : product.inventory.quantity > 0 ? (
              `${product.inventory.quantity} en stock`
            ) : (
              <span className="text-red-500">Rupture de stock</span>
            )}
          </span>
          {product.status !== 'active' && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              {product.status}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link href={`/products/${product.id}`} className="flex-1">
            <Button variant="outline" className="w-full text-sm">
              Voir détails
            </Button>
          </Link>
          
          {product.status === 'active' && (
            <Button
              onClick={handleAddToCart}
              disabled={isLoading || product.inventory.quantity === 0}
              className="flex-1 text-sm"
              variant={productInCart ? "default" : "default"}
            >
              {isLoading ? (
                'Ajout...'
              ) : productInCart ? (
                '✓ Ajouté'
              ) : (
                '🛒 Ajouter'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductCard