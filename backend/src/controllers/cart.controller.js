const Cart = require('../models/cart.model');

class CartController {
  static async getCart(req, res, next) {
    try {
      const cart = await Cart.getByUserId(req.userId);
      
      res.status(200).json({
        success: true,
        data: { cart: cart ? cart.toJSON() : null }
      });
    } catch (error) {
      next(error);
    }
  }

  static async addToCart(req, res, next) {
    try {
      const { productId, quantity = 1 } = req.body;
      
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }

      if (quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be greater than 0'
        });
      }

      const cart = await Cart.addItem(req.userId, productId, quantity);
      
      res.status(200).json({
        success: true,
        message: 'Item added to cart successfully',
        data: { cart: cart.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateCartItem(req, res, next) {
    try {
      const { itemId } = req.params;
      const { quantity } = req.body;
      
      if (!quantity || quantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid quantity is required'
        });
      }

      const cart = await Cart.updateItem(req.userId, itemId, quantity);
      
      res.status(200).json({
        success: true,
        message: 'Cart item updated successfully',
        data: { cart: cart.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeFromCart(req, res, next) {
    try {
      const { itemId } = req.params;
      
      const cart = await Cart.removeItem(req.userId, itemId);
      
      res.status(200).json({
        success: true,
        message: 'Item removed from cart successfully',
        data: { cart: cart.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async clearCart(req, res, next) {
    try {
      const cart = await Cart.clear(req.userId);
      
      res.status(200).json({
        success: true,
        message: 'Cart cleared successfully',
        data: { cart: cart.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async validateCart(req, res, next) {
    try {
      const cart = await Cart.getByUserId(req.userId);
      
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      const validation = await cart.validateForCheckout();
      
      res.status(200).json({
        success: true,
        data: {
          validation,
          cart: cart.toJSON()
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CartController;