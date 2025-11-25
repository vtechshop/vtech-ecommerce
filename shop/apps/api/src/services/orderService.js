// FILE: apps/api/src/services/orderService.js
const Order = require('../models/Order');
const Product = require('../models/Product');
const Commission = require('../models/Commission');
const Affiliate = require('../models/Affiliate');
const { generateOrderId } = require('../utils/helpers');
const logger = require('../config/logger');

class OrderService {
  async createOrder(userId, orderData) {
    // Validate products and calculate totals
    const items = await this.validateAndPrepareItems(orderData.items);

    const subtotal = items.reduce((sum, item) => sum + item.priceSnapshot * item.qty, 0);
    // Get tax rate from environment or default to 18% GST (India)
    const taxRate = parseFloat(process.env.DEFAULT_TAX_RATE || '0.18');
    const tax = subtotal * taxRate;
    const shipping = subtotal > 8000 ? 0 : 499; // Free shipping above ₹8000, otherwise ₹499
    const total = subtotal + tax + shipping;

    const order = await Order.create({
      orderId: generateOrderId(),
      userId,
      items,
      totals: {
        subtotal,
        tax,
        shipping,
        discount: 0,
        total,
      },
      shipTo: orderData.shipTo,
      payment: {
        method: orderData.paymentMethod,
        status: 'pending',
      },
      status: 'placed',
      events: [
        {
          status: 'placed',
          description: 'Order placed successfully',
          timestamp: new Date(),
        },
      ],
    });

    // Update product stock
    await this.updateProductStock(items);

    // Track affiliate conversion if exists
    await this.trackAffiliateConversion(userId, order);

    logger.info(`Order created: ${order.orderId}`);

    return order;
  }

  async validateAndPrepareItems(items) {
    const preparedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (!product.published) {
        throw new Error(`Product not available: ${product.title}`);
      }

      if (product.stock < item.qty) {
        throw new Error(`Insufficient stock for: ${product.title}`);
      }

      preparedItems.push({
        productId: product._id,
        vendorId: product.vendorId,
        qty: item.qty,
        priceSnapshot: product.price,
        name: product.title,
        image: product.images?.[0],
        productSlug: product.slug,
        sku: product.sku,
        variantId: item.variantId,
      });
    }

    return preparedItems;
  }

  async updateProductStock(items) {
    for (const item of items) {
      // Validate qty is positive integer to prevent NoSQL injection
      if (!Number.isInteger(item.qty) || item.qty <= 0) {
        throw new Error(`Invalid quantity for product ${item.productId}: ${item.qty}`);
      }

      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.qty },
      });
    }
  }

  async trackAffiliateConversion(userId, order) {
    // Check if user has affiliate cookie
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (user?.affiliateCode) {
      const affiliate = await Affiliate.findOne({ code: user.affiliateCode, status: 'active' });

      if (affiliate) {
        // Create commission
        const commissionAmount = order.totals.subtotal * (affiliate.commissionPercentage / 100);

        await Commission.create({
          orderId: order._id,
          subjectId: affiliate._id,
          type: 'affiliate',
          amount: commissionAmount,
          percentage: affiliate.commissionPercentage,
          status: 'pending',
        });

        // Update affiliate stats
        affiliate.totalConversions += 1;
        affiliate.pendingEarnings += commissionAmount;
        await affiliate.save();

        logger.info(`Affiliate conversion tracked: ${affiliate.code}`);
      }
    }
  }

  async processRefund(orderId, amount, reason) {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.payment.status !== 'paid') {
      throw new Error('Order has not been paid');
    }

    // Process refund through payment service
    const paymentService = require('./paymentService');
    await paymentService.refund(order.payment.provider, order.payment.paymentId, amount);

    // Update order
    order.refund = {
      amount,
      reason,
      status: 'processed',
      processedAt: new Date(),
    };
    order.status = 'refunded';
    order.events.push({
      status: 'refunded',
      description: `Refund processed: ${reason}`,
      timestamp: new Date(),
    });
await order.save();

// Restore product stock
for (const item of order.items) {
  await Product.findByIdAndUpdate(item.productId, {
    $inc: { stock: item.qty },
  });
}

logger.info(`Refund processed: ${order.orderId}`);

return order;
}
}
module.exports = new OrderService();