// FILE: apps/api/src/services/inventoryAlertService.js
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const logger = require('../config/logger');
const notificationHelper = require('./notificationHelper');

// Inventory thresholds
const INVENTORY_CONFIG = {
  LOW_STOCK_THRESHOLD: 10,        // Alert when stock falls below 10
  CRITICAL_STOCK_THRESHOLD: 5,    // Critical alert when stock falls below 5
  OUT_OF_STOCK_THRESHOLD: 0,      // Out of stock alert
  REORDER_POINT_MULTIPLIER: 2,    // Reorder when stock = 2x average daily sales
};

class InventoryAlertService {
  /**
   * Check all products for low stock and send alerts
   * Should be run via cron job (e.g., daily at 9 AM)
   */
  static async checkLowStockProducts() {
    try {
      logger.info('[Inventory] Starting low stock check...');

      const lowStockProducts = await Product.find({
        stock: { $lte: INVENTORY_CONFIG.LOW_STOCK_THRESHOLD },
        published: true,
      })
        .populate('vendorId', 'storeName email userId')
        .populate('category', 'name')
        .lean();

      const alerts = {
        outOfStock: [],
        critical: [],
        low: [],
      };

      for (const product of lowStockProducts) {
        if (product.stock <= INVENTORY_CONFIG.OUT_OF_STOCK_THRESHOLD) {
          alerts.outOfStock.push(product);
        } else if (product.stock <= INVENTORY_CONFIG.CRITICAL_STOCK_THRESHOLD) {
          alerts.critical.push(product);
        } else {
          alerts.low.push(product);
        }
      }

      // Send alerts to admins
      await this.sendAdminAlerts(alerts);

      // Send alerts to vendors
      await this.sendVendorAlerts(lowStockProducts);

      logger.info(`[Inventory] Low stock check completed:`, {
        outOfStock: alerts.outOfStock.length,
        critical: alerts.critical.length,
        low: alerts.low.length,
      });

      return {
        success: true,
        summary: {
          totalChecked: lowStockProducts.length,
          outOfStock: alerts.outOfStock.length,
          critical: alerts.critical.length,
          low: alerts.low.length,
        },
        alerts,
      };
    } catch (error) {
      logger.error('[Inventory] Error checking low stock:', error);
      throw error;
    }
  }

  /**
   * Send alerts to admin users
   */
  static async sendAdminAlerts(alerts) {
    try {
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin' }).select('_id email name');

      if (admins.length === 0) {
        logger.warn('[Inventory] No admin users found for alerts');
        return;
      }

      for (const admin of admins) {
        // Out of stock alerts (highest priority)
        if (alerts.outOfStock.length > 0) {
          await Notification.create({
            user: admin._id,
            type: 'inventory_alert',
            title: `🚨 ${alerts.outOfStock.length} Products Out of Stock`,
            message: `The following products are out of stock and need immediate restocking: ${alerts.outOfStock.map(p => p.title).slice(0, 5).join(', ')}${alerts.outOfStock.length > 5 ? `... and ${alerts.outOfStock.length - 5} more` : ''}`,
            priority: 'high',
            actionUrl: '/dashboard/admin/inventory',
            metadata: {
              products: alerts.outOfStock.map(p => ({
                id: p._id,
                title: p.title,
                sku: p.sku,
                stock: p.stock,
              })),
            },
          });
        }

        // Critical stock alerts
        if (alerts.critical.length > 0) {
          await Notification.create({
            user: admin._id,
            type: 'inventory_alert',
            title: `⚠️ ${alerts.critical.length} Products Critically Low`,
            message: `These products have critically low stock (< 5 units): ${alerts.critical.map(p => p.title).slice(0, 5).join(', ')}${alerts.critical.length > 5 ? `... and ${alerts.critical.length - 5} more` : ''}`,
            priority: 'high',
            actionUrl: '/dashboard/admin/inventory',
            metadata: {
              products: alerts.critical.map(p => ({
                id: p._id,
                title: p.title,
                sku: p.sku,
                stock: p.stock,
              })),
            },
          });
        }

        // Low stock alerts
        if (alerts.low.length > 0) {
          await Notification.create({
            user: admin._id,
            type: 'inventory_alert',
            title: `📦 ${alerts.low.length} Products Low on Stock`,
            message: `These products are running low on inventory: ${alerts.low.map(p => p.title).slice(0, 5).join(', ')}${alerts.low.length > 5 ? `... and ${alerts.low.length - 5} more` : ''}`,
            priority: 'medium',
            actionUrl: '/dashboard/admin/inventory',
            metadata: {
              products: alerts.low.map(p => ({
                id: p._id,
                title: p.title,
                sku: p.sku,
                stock: p.stock,
              })),
            },
          });
        }
      }

      logger.info(`[Inventory] Sent alerts to ${admins.length} admins`);
    } catch (error) {
      logger.error('[Inventory] Error sending admin alerts:', error);
    }
  }

  /**
   * Send alerts to vendor users for their products
   */
  static async sendVendorAlerts(products) {
    try {
      // Group products by vendor
      const productsByVendor = {};

      for (const product of products) {
        if (!product.vendorId) continue;

        const vendorId = product.vendorId._id.toString();
        if (!productsByVendor[vendorId]) {
          productsByVendor[vendorId] = {
            vendor: product.vendorId,
            products: [],
          };
        }
        productsByVendor[vendorId].products.push(product);
      }

      // Send notification to each vendor
      for (const [vendorId, data] of Object.entries(productsByVendor)) {
        if (!data.vendor.userId) continue;

        const outOfStock = data.products.filter(p => p.stock <= 0);
        const lowStock = data.products.filter(p => p.stock > 0 && p.stock <= INVENTORY_CONFIG.LOW_STOCK_THRESHOLD);

        let title, message, priority;

        if (outOfStock.length > 0) {
          title = `🚨 ${outOfStock.length} of your products are out of stock`;
          message = `Please restock: ${outOfStock.map(p => p.title).slice(0, 3).join(', ')}${outOfStock.length > 3 ? `... and ${outOfStock.length - 3} more` : ''}`;
          priority = 'high';
        } else {
          title = `📦 ${lowStock.length} of your products are low on stock`;
          message = `Consider restocking: ${lowStock.map(p => p.title).slice(0, 3).join(', ')}${lowStock.length > 3 ? `... and ${lowStock.length - 3} more` : ''}`;
          priority = 'medium';
        }

        await Notification.create({
          user: data.vendor.userId,
          type: 'vendor_inventory_alert',
          title,
          message,
          priority,
          actionUrl: '/dashboard/vendor/products',
          metadata: {
            vendorId,
            products: data.products.map(p => ({
              id: p._id,
              title: p.title,
              sku: p.sku,
              stock: p.stock,
            })),
          },
        });
      }

      logger.info(`[Inventory] Sent alerts to ${Object.keys(productsByVendor).length} vendors`);
    } catch (error) {
      logger.error('[Inventory] Error sending vendor alerts:', error);
    }
  }

  /**
   * Get low stock report (for admin dashboard)
   */
  static async getLowStockReport() {
    try {
      const products = await Product.find({
        stock: { $lte: INVENTORY_CONFIG.LOW_STOCK_THRESHOLD },
        published: true,
      })
        .populate('vendorId', 'storeName')
        .populate('category', 'name')
        .sort({ stock: 1 }) // Lowest stock first
        .select('title sku stock price vendorId category images')
        .lean();

      const summary = {
        total: products.length,
        outOfStock: products.filter(p => p.stock <= 0).length,
        critical: products.filter(p => p.stock > 0 && p.stock <= INVENTORY_CONFIG.CRITICAL_STOCK_THRESHOLD).length,
        low: products.filter(p => p.stock > INVENTORY_CONFIG.CRITICAL_STOCK_THRESHOLD && p.stock <= INVENTORY_CONFIG.LOW_STOCK_THRESHOLD).length,
      };

      return { products, summary };
    } catch (error) {
      logger.error('[Inventory] Error getting low stock report:', error);
      throw error;
    }
  }

  /**
   * Update product stock and check if alert needed
   */
  static async updateStockAndCheckAlert(productId, newStock, reason = 'manual_update') {
    try {
      const product = await Product.findById(productId)
        .populate('vendorId', 'storeName email userId');

      if (!product) {
        throw new Error('Product not found');
      }

      const oldStock = product.stock;
      product.stock = newStock;
      await product.save();

      // Check if we crossed a threshold
      const crossedThreshold =
        (oldStock > INVENTORY_CONFIG.LOW_STOCK_THRESHOLD && newStock <= INVENTORY_CONFIG.LOW_STOCK_THRESHOLD) ||
        (oldStock > INVENTORY_CONFIG.CRITICAL_STOCK_THRESHOLD && newStock <= INVENTORY_CONFIG.CRITICAL_STOCK_THRESHOLD) ||
        (oldStock > 0 && newStock <= 0);

      if (crossedThreshold) {
        logger.info(`[Inventory] Product ${product.title} (${product.sku}) crossed threshold: ${oldStock} -> ${newStock}`);

        // Send immediate alert
        await this.sendProductAlert(product, reason);
      }

      return {
        success: true,
        product,
        oldStock,
        newStock,
        alertSent: crossedThreshold,
      };
    } catch (error) {
      logger.error('[Inventory] Error updating stock:', error);
      throw error;
    }
  }

  /**
   * Send alert for specific product
   */
  static async sendProductAlert(product, reason) {
    try {
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin' }).select('_id');

      let title, message, priority;

      if (product.stock <= 0) {
        title = `🚨 Product Out of Stock`;
        message = `${product.title} (SKU: ${product.sku}) is now out of stock. Reason: ${reason}`;
        priority = 'high';
      } else if (product.stock <= INVENTORY_CONFIG.CRITICAL_STOCK_THRESHOLD) {
        title = `⚠️ Critical Stock Alert`;
        message = `${product.title} (SKU: ${product.sku}) has only ${product.stock} units left. Reason: ${reason}`;
        priority = 'high';
      } else {
        title = `📦 Low Stock Alert`;
        message = `${product.title} (SKU: ${product.sku}) is low on stock (${product.stock} units). Reason: ${reason}`;
        priority = 'medium';
      }

      // Notify admins
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          type: 'inventory_alert',
          title,
          message,
          priority,
          actionUrl: `/dashboard/admin/products/${product._id}`,
          metadata: {
            productId: product._id,
            sku: product.sku,
            stock: product.stock,
            reason,
          },
        });
      }

      // Notify vendor if applicable
      if (product.vendorId?.userId) {
        await Notification.create({
          user: product.vendorId.userId,
          type: 'vendor_inventory_alert',
          title,
          message,
          priority,
          actionUrl: `/dashboard/vendor/products/${product._id}`,
          metadata: {
            productId: product._id,
            sku: product.sku,
            stock: product.stock,
            reason,
          },
        });
      }

      logger.info(`[Inventory] Sent alert for product: ${product.title}`);
    } catch (error) {
      logger.error('[Inventory] Error sending product alert:', error);
    }
  }
}

module.exports = { InventoryAlertService, INVENTORY_CONFIG };
