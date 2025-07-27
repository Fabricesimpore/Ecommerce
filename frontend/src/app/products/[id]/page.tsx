'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { productApi, Product } from '@/lib/api/products'
import { useCartActions } from '@/lib/stores/cartStore'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, Minus } from 'lucide-react'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addItem, openCart } = useCartActions()
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)

  const productId = parseInt(params.id as string)

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId || isNaN(productId)) {
        setError('ID produit invalide')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const fetchedProduct = await productApi.getProduct(productId)
        setProduct(fetchedProduct)
      } catch (err) {
        console.error('Failed to fetch product:', err)
        setError('Produit non trouvé')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  const handleAddToCart = async () => {
    if (!product) return
    
    setAddingToCart(true)
    try {
      addItem(product, quantity)
      setTimeout(() => {
        openCart()
      }, 500)
    } catch (error) {
      console.error('Failed to add to cart:', error)
    } finally {
      setAddingToCart(false)
    }
  }

  const incrementQuantity = () => {
    setQuantity(prev => Math.min(prev + 1, 10))
  }

  const decrementQuantity = () => {
    setQuantity(prev => Math.max(prev - 1, 1))
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement du produit...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">❌ {error || 'Produit non trouvé'}</div>
            <Button onClick={() => router.push('/products')}>
              Retour aux produits
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const discountPercentage = product.compareAtPrice 
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
            {/* Product Image */}
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.title || product.name || product.description}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-6xl">📦</div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              <div className="flex-1">
                {/* Category Badge */}
                <div className="mb-3">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium capitalize">
                    {product.category}
                  </span>
                </div>

                {/* Product Name */}
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {product.title || product.name || 'Produit sans nom'}
                </h1>

                {/* Description */}
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {product.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </span>
                    {product.compareAtPrice && (
                      <>
                        <span className="text-lg text-gray-500 line-through">
                          {formatPrice(product.compareAtPrice)}
                        </span>
                        <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full font-medium">
                          -{discountPercentage}%
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Quantity Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantité
                  </label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-medium px-3">
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={incrementQuantity}
                      disabled={quantity >= 10}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Add to Cart Button */}
                <Button
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="w-full text-lg py-3"
                  size="lg"
                >
                  {addingToCart ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Ajout en cours...
                    </div>
                  ) : (
                    `🛒 Ajouter au panier • ${formatPrice(product.price * quantity)}`
                  )}
                </Button>
              </div>

              {/* Product Features */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Caractéristiques
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-green-600">✅</span>
                    <span className="text-gray-600">Produit local de qualité</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-green-600">🚚</span>
                    <span className="text-gray-600">Livraison gratuite dès 50 000 CFA</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-green-600">🔄</span>
                    <span className="text-gray-600">Retour possible sous 7 jours</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-green-600">💳</span>
                    <span className="text-gray-600">Paiement sécurisé</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Produits similaires
          </h2>
          <div className="bg-white rounded-lg p-6 text-center">
            <p className="text-gray-600">
              Les produits similaires seront bientôt disponibles
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}