// FILE: apps/api/src/services/cartService.js
const Cart = require('../models/Cart');
const Product = require('../models/Product');

class CartService {
  async getOrCreateCart(userId) {
    let cart = await Cart.findOne({ userId }).populate('items.product');

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    return cart;
  }

  async addItem(userId, productId, quantity, variantId = null) {
    const product = await Product.findById(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    if (!product.published) {
      throw new Error('Product is not available');
    }

    if (product.stock < quantity) {
      throw new Error('Insufficient stock');
    }

    let cart = await this.getOrCreateCart(userId);

    // Check if item already exists
    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        (!variantId || item.variantId?.toString() === variantId)
    );

    if (existingItemIndex > -1) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      if (product.stock < newQuantity) {
        throw new Error('Insufficient stock');
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity,
        variantId,
      });
    }

    await cart.save();
    await cart.populate('items.product');

    return cart;
  }

  async updateQuantity(userId, itemId, quantity) {
    const cart = await Cart.findOne({ userId }).populate('items.product');

    if (!cart) {
      throw new Error('Cart not found');
    }

    const item = cart.items.id(itemId);

    if (!item) {
      throw new Error('Item not found in cart');
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    if (item.product.stock < quantity) {
      throw new Error('Insufficient stock');
    }

    item.quantity = quantity;
    await cart.save();

    return cart;
  }

  async removeItem(userId, itemId) {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      throw new Error('Cart not found');
    }

    cart.items.pull(itemId);
    await cart.save();
    await cart.populate('items.product');

    return cart;
  }

  async clearCart(userId) {
    const cart = await Cart.findOne({ userId });

    if (cart) {
      cart.items = [];
      await cart.save();
    }

    return cart;
  }

  calculateTotals(cart) {
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    const tax = subtotal * 0.1; // 10% tax
    const shipping = subtotal > 50 ? 0 : 5.99;
    const discount = 0; // Apply coupon logic here
    const total = subtotal + tax + shipping - discount;

    return {
      subtotal,
      tax,
      shipping,
      discount,
      total,
    };
  }
}

module.exports = new CartService();