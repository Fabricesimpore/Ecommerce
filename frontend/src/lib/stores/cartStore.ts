import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Product } from '@/lib/api/products'

// Cart item interface
export interface CartItem {
  id: number
  product: Product
  quantity: number
  addedAt: string
}

// Cart totals interface
export interface CartTotals {
  subtotal: number
  shipping: number
  tax: number
  total: number
  itemCount: number
}

// Cart state interface
interface CartState {
  items: CartItem[]
  isOpen: boolean
  
  // Actions
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  
  // Getters
  getItem: (productId: number) => CartItem | undefined
  getTotals: () => CartTotals
  getItemCount: () => number
  isInCart: (productId: number) => boolean
}

// Calculate cart totals
const calculateTotals = (items: CartItem[]): CartTotals => {
  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  
  // Simple shipping calculation - free shipping over 50,000 CFA
  const shipping = subtotal >= 50000 ? 0 : 2500
  
  // Simple tax calculation - 5% VAT
  const tax = Math.round(subtotal * 0.05)
  
  const total = subtotal + shipping + tax

  return {
    subtotal,
    shipping,
    tax,
    total,
    itemCount
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product: Product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(item => item.id === product.id)
          
          if (existingItem) {
            // Update quantity if item already exists
            return {
              items: state.items.map(item =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              )
            }
          } else {
            // Add new item
            const newItem: CartItem = {
              id: product.id,
              product,
              quantity,
              addedAt: new Date().toISOString()
            }
            return {
              items: [...state.items, newItem]
            }
          }
        })
      },

      removeItem: (productId: number) => {
        set((state) => ({
          items: state.items.filter(item => item.id !== productId)
        }))
      },

      updateQuantity: (productId: number, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        
        set((state) => ({
          items: state.items.map(item =>
            item.id === productId
              ? { ...item, quantity }
              : item
          )
        }))
      },

      clearCart: () => {
        set({ items: [] })
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }))
      },

      openCart: () => {
        set({ isOpen: true })
      },

      closeCart: () => {
        set({ isOpen: false })
      },

      getItem: (productId: number) => {
        return get().items.find(item => item.id === productId)
      },

      getTotals: () => {
        return calculateTotals(get().items)
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      isInCart: (productId: number) => {
        return get().items.some(item => item.id === productId)
      }
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items }), // Only persist items, not UI state
    }
  )
)

// Convenience hooks
export const useCart = () => {
  const store = useCartStore()
  return {
    items: store.items,
    isOpen: store.isOpen,
    totals: store.getTotals(),
    itemCount: store.getItemCount()
  }
}

export const useCartActions = () => {
  const store = useCartStore()
  return {
    addItem: store.addItem,
    removeItem: store.removeItem,
    updateQuantity: store.updateQuantity,
    clearCart: store.clearCart,
    toggleCart: store.toggleCart,
    openCart: store.openCart,
    closeCart: store.closeCart,
    getItem: store.getItem,
    isInCart: store.isInCart
  }
}