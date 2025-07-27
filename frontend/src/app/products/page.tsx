'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { productApi, Product, ProductSearchParams } from '@/lib/api/products'
import { ProductCard } from '@/components/products/ProductCard'
import { Button } from '@/components/ui/button'

function ProductsPageContent() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ProductSearchParams>({
    page: 1,
    limit: 12,
    category: searchParams.get('category') || undefined,
    search: searchParams.get('search') || undefined,
  })
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  // Fetch products
  const fetchProducts = async (params: ProductSearchParams) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await productApi.getProducts(params)
      setProducts(response.products)
      setPagination({
        page: response.pagination.page,
        total: response.pagination.total || 0,
        totalPages: response.pagination.totalPages || 0,
        hasNext: response.pagination.hasNext,
        hasPrev: response.pagination.hasPrev
      })
    } catch (err) {
      console.error('Failed to fetch products:', err)
      setError('Erreur lors du chargement des produits')
    } finally {
      setLoading(false)
    }
  }

  // Load products on mount and filter changes
  useEffect(() => {
    fetchProducts(filters)
  }, [filters])


  // Handle category filter
  const handleCategoryFilter = (category: string) => {
    setFilters(prev => ({
      ...prev,
      category: category === 'all' ? undefined : category,
      page: 1
    }))
  }

  // Handle search
  const handleSearch = (search: string) => {
    setFilters(prev => ({
      ...prev,
      search: search || undefined,
      page: 1
    }))
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des produits...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">❌ {error}</div>
            <Button onClick={() => fetchProducts(filters)}>
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🛍️ Nos Produits
              </h1>
              <p className="mt-2 text-gray-600">
                Découvrez nos produits locaux de qualité
              </p>
            </div>
            
            {/* Search Bar */}
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Rechercher des produits..."
                defaultValue={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
        {/* Category Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!filters.category ? "default" : "outline"}
              onClick={() => handleCategoryFilter('all')}
              size="sm"
            >
              Tous
            </Button>
            <Button
              variant={filters.category === 'fashion' ? "default" : "outline"}
              onClick={() => handleCategoryFilter('fashion')}
              size="sm"
            >
              Mode
            </Button>
            <Button
              variant={filters.category === 'beauty' ? "default" : "outline"}
              onClick={() => handleCategoryFilter('beauty')}
              size="sm"
            >
              Beauté
            </Button>
            <Button
              variant={filters.category === 'food' ? "default" : "outline"}
              onClick={() => handleCategoryFilter('food')}
              size="sm"
            >
              Alimentation
            </Button>
            <Button
              variant={filters.category === 'crafts' ? "default" : "outline"}
              onClick={() => handleCategoryFilter('crafts')}
              size="sm"
            >
              Artisanat
            </Button>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            {products.length > 0 ? (
              `${products.length} produit${products.length > 1 ? 's' : ''} trouvé${products.length > 1 ? 's' : ''}`
            ) : (
              'Aucun produit trouvé'
            )}
          </p>
          
          {loading && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Chargement...</span>
            </div>
          )}
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                >
                  ← Précédent
                </Button>
                
                <span className="text-gray-600">
                  Page {pagination.page} sur {pagination.totalPages}
                </span>
                
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                >
                  Suivant →
                </Button>
              </div>
            )}
          </>
        ) : (
          !loading && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Aucun produit trouvé
              </h3>
              <p className="text-gray-600 mb-4">
                Essayez de modifier vos critères de recherche
              </p>
              <Button onClick={() => {
                setFilters({ page: 1, limit: 12 })
              }}>
                Voir tous les produits
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    }>
      <ProductsPageContent />
    </Suspense>
  )
}