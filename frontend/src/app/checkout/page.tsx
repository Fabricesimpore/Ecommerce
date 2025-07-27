'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart, useCartActions } from '@/lib/stores/cartStore'
import { useAuthStore } from '@/lib/stores/authStore'
import { OrderCreateRequest } from '@/lib/api/orders'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CreditCard, MapPin, User } from 'lucide-react'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totals } = useCart()
  const { clearCart } = useCartActions()
  const { user, isAuthenticated } = useAuthStore()
  
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping')
  
  const [shippingInfo, setShippingInfo] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    region: '',
    postalCode: ''
  })
  
  const [paymentMethod, setPaymentMethod] = useState<'orange_money' | 'moov_money' | 'cash_on_delivery'>('orange_money')

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const shipping = totals.shipping
  const tax = totals.tax
  const finalTotal = totals.total

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    const required = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'region']
    const missing = required.filter(field => !shippingInfo[field as keyof typeof shippingInfo])
    
    if (missing.length > 0) {
      alert(`Veuillez remplir tous les champs requis: ${missing.join(', ')}`)
      return
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(shippingInfo.email)) {
      alert('Veuillez entrer une adresse email valide')
      return
    }
    
    setStep('payment')
  }

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('review')
  }

  const handleOrderSubmit = async () => {
    setLoading(true)
    try {
      // For now, simulate API call since backend order creation might not be implemented
      // const order = await orderApi.createOrder(orderData)
      console.log('Order data prepared:', {
        items: items.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.product.price
        })),
        shippingAddress: shippingInfo,
        paymentMethod,
        notes: `Commande passée via l'interface web. Méthode de paiement: ${paymentMethod}`
      })
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Store order info in localStorage for the success page
      localStorage.setItem('lastOrder', JSON.stringify({
        orderNumber: Math.random().toString(36).substr(2, 9).toUpperCase(),
        items: items,
        total: finalTotal,
        shippingInfo,
        paymentMethod,
        createdAt: new Date().toISOString()
      }))
      
      // Clear cart and redirect to success page
      clearCart()
      router.push('/checkout/success')
    } catch (error) {
      console.error('Order submission failed:', error)
      alert('Erreur lors de la commande. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  // Redirect if cart is empty
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Votre panier est vide
            </h1>
            <p className="text-gray-600 mb-6">
              Ajoutez des produits à votre panier pour procéder à la commande
            </p>
            <Button onClick={() => router.push('/products')}>
              Voir les produits
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Connexion requise
            </h1>
            <p className="text-gray-600 mb-6">
              Vous devez être connecté pour passer une commande
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push('/login')}>
                Se connecter
              </Button>
              <Button variant="outline" onClick={() => router.push('/register')}>
                S&apos;inscrire
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Finaliser votre commande
          </h1>
          
          {/* Progress Steps */}
          <div className="flex items-center space-x-4 mt-6">
            <div className={`flex items-center ${step === 'shipping' ? 'text-blue-600' : step === 'payment' || step === 'review' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'shipping' ? 'border-blue-600 bg-blue-50' : step === 'payment' || step === 'review' ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
                <MapPin className="h-4 w-4" />
              </div>
              <span className="ml-2 font-medium">Livraison</span>
            </div>
            
            <div className={`w-8 h-0.5 ${step === 'payment' || step === 'review' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            
            <div className={`flex items-center ${step === 'payment' ? 'text-blue-600' : step === 'review' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'payment' ? 'border-blue-600 bg-blue-50' : step === 'review' ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
                <CreditCard className="h-4 w-4" />
              </div>
              <span className="ml-2 font-medium">Paiement</span>
            </div>
            
            <div className={`w-8 h-0.5 ${step === 'review' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            
            <div className={`flex items-center ${step === 'review' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'review' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                <User className="h-4 w-4" />
              </div>
              <span className="ml-2 font-medium">Confirmation</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Shipping Information */}
            {step === 'shipping' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Informations de livraison
                </h2>
                
                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.firstName}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.lastName}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={shippingInfo.email}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={shippingInfo.phone}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+226 XX XX XX XX"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Rue, quartier, secteur..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ville *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ouagadougou"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Région *
                      </label>
                      <select
                        required
                        value={shippingInfo.region}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, region: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Sélectionner</option>
                        <option value="centre">Centre</option>
                        <option value="hauts-bassins">Hauts-Bassins</option>
                        <option value="cascades">Cascades</option>
                        <option value="nord">Nord</option>
                        <option value="sahel">Sahel</option>
                        <option value="est">Est</option>
                        <option value="sud-ouest">Sud-Ouest</option>
                        <option value="plateau-central">Plateau-Central</option>
                        <option value="centre-nord">Centre-Nord</option>
                        <option value="centre-ouest">Centre-Ouest</option>
                        <option value="centre-est">Centre-Est</option>
                        <option value="centre-sud">Centre-Sud</option>
                        <option value="boucle-du-mouhoun">Boucle du Mouhoun</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Code postal
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.postalCode}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, postalCode: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="01 BP 1234"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="w-full md:w-auto">
                      Continuer vers le paiement
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Payment Method */}
            {step === 'payment' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Méthode de paiement
                  </h2>
                  <Button
                    variant="ghost"
                    onClick={() => setStep('shipping')}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Modifier l'adresse
                  </Button>
                </div>
                
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div className="space-y-3">
                    <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="payment"
                        value="orange_money"
                        checked={paymentMethod === 'orange_money'}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="mr-3"
                      />
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center mr-3">
                          <span className="text-white text-xs font-bold">OM</span>
                        </div>
                        <div>
                          <div className="font-medium">Orange Money</div>
                          <div className="text-sm text-gray-500">Paiement mobile sécurisé</div>
                        </div>
                      </div>
                    </label>
                    
                    <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="payment"
                        value="moov_money"
                        checked={paymentMethod === 'moov_money'}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="mr-3"
                      />
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center mr-3">
                          <span className="text-white text-xs font-bold">MM</span>
                        </div>
                        <div>
                          <div className="font-medium">Moov Money</div>
                          <div className="text-sm text-gray-500">Paiement mobile sécurisé</div>
                        </div>
                      </div>
                    </label>
                    
                    <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="payment"
                        value="cash_on_delivery"
                        checked={paymentMethod === 'cash_on_delivery'}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="mr-3"
                      />
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center mr-3">
                          <span className="text-white text-xs font-bold">💰</span>
                        </div>
                        <div>
                          <div className="font-medium">Paiement à la livraison</div>
                          <div className="text-sm text-gray-500">Payez en espèces à la réception</div>
                        </div>
                      </div>
                    </label>
                  </div>
                  
                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep('shipping')}
                    >
                      Retour
                    </Button>
                    <Button type="submit">
                      Continuer vers la confirmation
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Order Review */}
            {step === 'review' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Confirmation de commande
                  </h2>
                </div>
                
                {/* Shipping Info Summary */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">Adresse de livraison</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep('shipping')}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Modifier
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>{shippingInfo.firstName} {shippingInfo.lastName}</p>
                    <p>{shippingInfo.address}</p>
                    <p>{shippingInfo.city}, {shippingInfo.region}</p>
                    <p>{shippingInfo.phone}</p>
                  </div>
                </div>
                
                {/* Payment Method Summary */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">Méthode de paiement</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep('payment')}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Modifier
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    {paymentMethod === 'orange_money' && 'Orange Money'}
                    {paymentMethod === 'moov_money' && 'Moov Money'}
                    {paymentMethod === 'cash_on_delivery' && 'Paiement à la livraison'}
                  </div>
                </div>
                
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep('payment')}
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={handleOrderSubmit}
                    disabled={loading}
                    className="min-w-[150px]"
                  >
                    {loading ? 'Traitement...' : `Confirmer la commande • ${formatPrice(finalTotal)}`}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Résumé de commande
              </h3>
              
              {/* Cart Items */}
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📦</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.product.title || item.product.name || item.product.description}
                      </p>
                      <p className="text-sm text-gray-500">Qté: {item.quantity}</p>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatPrice(item.product.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Order Total */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sous-total</span>
                  <span>{formatPrice(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Livraison</span>
                  <span>{shipping === 0 ? 'Gratuite' : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>TVA (5%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2">
                  <span>Total</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>
              </div>
              
              {shipping === 0 && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    🎉 Livraison gratuite incluse!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}