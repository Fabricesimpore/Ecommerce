'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, Package, Truck, Phone } from 'lucide-react'

interface OrderInfo {
  orderNumber: string
  items: Array<{id: number; title?: string; name?: string; description: string; quantity: number; price: number}>
  total: number
  shippingInfo: {city: string; region: string; [key: string]: string}
  paymentMethod: string
  createdAt: string
}

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(price)
  }

  useEffect(() => {
    // Get order info from localStorage
    const storedOrder = localStorage.getItem('lastOrder')
    if (storedOrder) {
      try {
        const order = JSON.parse(storedOrder)
        setOrderInfo(order)
        // Clear the stored order after displaying
        localStorage.removeItem('lastOrder')
      } catch (error) {
        console.error('Error parsing stored order:', error)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          
          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Commande confirmée !
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            Merci pour votre commande. Vous recevrez bientôt un email de confirmation 
            avec les détails de votre commande et les informations de suivi.
          </p>
          
          {/* Order Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Que se passe-t-il ensuite ?
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Préparation de votre commande</h3>
                  <p className="text-sm text-gray-600">
                    Nous préparons vos articles avec soin. Cela peut prendre 1-2 jours ouvrés.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Truck className="w-4 h-4 text-orange-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Expédition</h3>
                  <p className="text-sm text-gray-600">
                    Votre commande sera expédiée et vous recevrez un numéro de suivi.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Livraison</h3>
                  <p className="text-sm text-gray-600">
                    Notre livreur vous contactera avant la livraison dans votre région.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Order Info */}
          <div className="bg-blue-50 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Numéro de commande:</span>
              <span className="font-mono font-semibold text-gray-900">
                #{orderInfo?.orderNumber || 'XXXXXXXXX'}
              </span>
            </div>
            {orderInfo && (
              <>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Total payé:</span>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(orderInfo.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Méthode de paiement:</span>
                  <span className="font-semibold text-gray-900">
                    {orderInfo.paymentMethod === 'orange_money' && 'Orange Money'}
                    {orderInfo.paymentMethod === 'moov_money' && 'Moov Money'}
                    {orderInfo.paymentMethod === 'cash_on_delivery' && 'Paiement à la livraison'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Adresse de livraison:</span>
                  <span className="font-semibold text-gray-900">
                    {orderInfo.shippingInfo.city}, {orderInfo.shippingInfo.region}
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-600">Date estimée de livraison:</span>
              <span className="font-semibold text-gray-900">
                {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>

          {/* Order Items Summary */}
          {orderInfo && orderInfo.items.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-8">
              <h3 className="font-semibold text-gray-900 mb-3">Articles commandés</h3>
              <div className="space-y-2">
                {orderInfo.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.title || item.name || item.description} × {item.quantity}
                    </span>
                    <span className="font-semibold">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push('/products')}
              className="w-full sm:w-auto"
            >
              Continuer vos achats
            </Button>
            
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="w-full sm:w-auto"
            >
              Voir mes commandes
            </Button>
          </div>
          
          {/* Support Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Besoin d&apos;aide ? Contactez notre service client au{' '}
              <a href="tel:+22670123456" className="text-blue-600 hover:text-blue-700 font-medium">
                +226 70 12 34 56
              </a>
              {' '}ou par email à{' '}
              <a href="mailto:support@ecommerce-bf.com" className="text-blue-600 hover:text-blue-700 font-medium">
                support@ecommerce-bf.com
              </a>
            </p>
          </div>
        </div>
        
        {/* Additional Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-white rounded-lg p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Suivi en temps réel</h3>
            <p className="text-sm text-gray-600">
              Suivez votre commande en temps réel depuis votre compte
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Truck className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Livraison rapide</h3>
            <p className="text-sm text-gray-600">
              Livraison dans toute le Burkina Faso en 2-5 jours ouvrés
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Satisfaction garantie</h3>
            <p className="text-sm text-gray-600">
              Retour gratuit sous 7 jours si vous n&apos;êtes pas satisfait
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}