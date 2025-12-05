// FILE: apps/api/src/services/notificationService.js
const { MailerSend, EmailParams, Sender, Recipient } = require('mailersend');
const env = require('../config/env');
const logger = require('../config/logger');

class NotificationService {
  constructor() {
    this.mailerSend = null;
    this.isConfigured = false;
    this.initialize();
  }

  initialize() {
    if (env.MAILERSEND_API_KEY) {
      try {
        this.mailerSend = new MailerSend({
          apiKey: env.MAILERSEND_API_KEY,
        });
        this.isConfigured = true;
        logger.info('Notification service configured with MailerSend');
      } catch (error) {
        logger.error('Failed to configure notification service:', error);
        this.isConfigured = false;
      }
    } else {
      logger.warn('Notification service not configured - MailerSend API key missing. Emails will be logged only.');
      this.isConfigured = false;
    }
  }

  async sendEmail(to, subject, html, text) {
    if (!this.isConfigured || !this.mailerSend) {
      logger.warn('Cannot send email - MailerSend not configured:', { to, subject });
      return { success: false, reason: 'MAILERSEND_NOT_CONFIGURED', messageId: null };
    }

    try {
      // Parse from email and name
      const fromMatch = env.MAIL_FROM.match(/^(.+?)\s*<(.+?)>$/);
      const fromName = fromMatch ? fromMatch[1].trim() : 'VTech Shop';
      const fromEmail = fromMatch ? fromMatch[2].trim() : env.MAIL_FROM;

      const sentFrom = new Sender(fromEmail, fromName);
      const recipients = [new Recipient(to)];

      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject(subject)
        .setHtml(html);

      // Add reply-to
      if (env.REPLY_TO_EMAIL) {
        emailParams.setReplyTo({ email: env.REPLY_TO_EMAIL, name: env.REPLY_TO_NAME || 'VTech Support' });
      }

      const response = await this.mailerSend.email.send(emailParams);

      logger.info(`Email sent successfully to ${to}`);
      return { success: true, messageId: response.headers?.['x-message-id'] || 'sent' };
    } catch (error) {
      logger.error('Email send failed:', error);
      return { success: false, error: error.message, messageId: null };
    }
  }

  async sendOrderConfirmation(user, order) {
    // Generate items list HTML
    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #eee;">
          <strong>${item.name}</strong><br>
          <small style="color: #666;">Qty: ${item.qty}</small>
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right;">
          ₹${(item.priceSnapshot * item.qty).toFixed(2)}
        </td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF9F1C 0%, #2EC4B6 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; }
          .order-box { background: white; border: 2px solid #2EC4B6; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .order-id { font-size: 24px; font-weight: bold; color: #2EC4B6; text-align: center; margin: 20px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .total-row { background: #f0f9ff; font-weight: bold; }
          .button { display: inline-block; background: #FF9F1C; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p>Thank you for your order! We're excited to get your items to you.</p>

            <div class="order-id">Order #${order.orderId}</div>

            <div class="order-box">
              <h3 style="margin-top: 0;">Order Details</h3>
              <table class="items-table">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  ${order.totals.shipping > 0 ? `
                  <tr>
                    <td style="padding: 15px;">Shipping</td>
                    <td style="padding: 15px; text-align: right;">₹${order.totals.shipping.toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  ${order.totals.tax > 0 ? `
                  <tr>
                    <td style="padding: 15px;">Tax</td>
                    <td style="padding: 15px; text-align: right;">₹${order.totals.tax.toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  <tr class="total-row">
                    <td style="padding: 15px; font-size: 18px;">Total</td>
                    <td style="padding: 15px; text-align: right; font-size: 18px; color: #2EC4B6;">₹${order.totals.total.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Shipping Address</h3>
              <p style="margin: 5px 0;"><strong>${order.shipTo?.fullName || 'N/A'}</strong></p>
              <p style="margin: 5px 0;">${order.shipTo?.address || 'N/A'}</p>
              <p style="margin: 5px 0;">${order.shipTo?.city || ''}, ${order.shipTo?.state || ''} ${order.shipTo?.zip || ''}</p>
              <p style="margin: 5px 0;">Phone: ${order.shipTo?.phone || 'N/A'}</p>
            </div>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <strong>Payment Method:</strong> ${order.payment?.method === 'cod' ? 'Cash on Delivery (COD)' : (order.payment?.method || 'N/A').toUpperCase()}
            </div>

            <p style="text-align: center;">
              <a href="${env.CLIENT_URL}/dashboard/orders/${order._id}" class="button">Track Your Order</a>
            </p>

            <p style="margin-top: 30px;">Need help? Contact our support team at <a href="mailto:${env.SUPPORT_EMAIL || 'support@vtechshop.com'}">${env.SUPPORT_EMAIL || 'support@vtechshop.com'}</a> or call ${env.SUPPORT_PHONE || 'N/A'}.</p>

            <p><em>- Vtech Team</em></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Vtech. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, `Order Confirmation - ${order.orderId}`, html);
  }

  async sendMultiVendorOrderConfirmation(user, vendorOrders, totalAmount) {
    // Guard against empty vendorOrders
    if (!vendorOrders || vendorOrders.length === 0) {
      logger.warn('sendMultiVendorOrderConfirmation called with empty vendorOrders');
      return { success: false, reason: 'NO_ORDERS' };
    }

    // Build summary of all orders
    const ordersSummaryHtml = vendorOrders.map((order, index) => `
      <div style="background: white; border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 15px 0;">
        <h3 style="margin-top: 0; color: #2EC4B6;">
          Order ${index + 1} of ${vendorOrders.length}: ${order.orderId}
        </h3>
        <table style="width: 100%; margin: 10px 0;">
          <tr>
            <td style="padding: 5px 0;"><strong>Items:</strong></td>
            <td style="padding: 5px 0;">${order.items.length} product(s)</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Subtotal:</strong></td>
            <td style="padding: 5px 0;">₹${order.totals.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Tax:</strong></td>
            <td style="padding: 5px 0;">₹${order.totals.tax.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Shipping:</strong></td>
            <td style="padding: 5px 0;">₹${order.totals.shipping.toFixed(2)}</td>
          </tr>
          <tr style="border-top: 2px solid #2EC4B6;">
            <td style="padding: 8px 0; font-weight: bold; font-size: 16px;">Order Total:</td>
            <td style="padding: 8px 0; font-weight: bold; font-size: 16px; color: #2EC4B6;">₹${order.totals.total.toFixed(2)}</td>
          </tr>
        </table>
        <p style="margin: 15px 0 0 0;">
          <a href="${env.CLIENT_URL}/dashboard/orders/${order._id}"
             style="color: #FF9F1C; text-decoration: none; font-weight: bold; font-size: 14px;">
            Track Order ${order.orderId} →
          </a>
        </p>
      </div>
    `).join('');

    const totalItems = vendorOrders.reduce((sum, o) => sum + o.items.length, 0);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF9F1C 0%, #2EC4B6 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; }
          .button { display: inline-block; background: #FF9F1C; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .summary-box { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #2EC4B6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Orders Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p>Thank you for your order! Your purchase has been split into <strong>${vendorOrders.length} separate orders</strong> by vendor for faster processing and shipping.</p>

            <div class="info-box">
              <strong>Why multiple orders?</strong><br>
              Your items are from different vendors, so each vendor will ship their products separately. This ensures faster delivery and better tracking!
            </div>

            <h2 style="color: #2EC4B6; margin-top: 30px;">Your Orders:</h2>
            ${ordersSummaryHtml}

            <div class="summary-box">
              <h3 style="margin-top: 0; color: #2EC4B6;">Order Summary</h3>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 5px 0;"><strong>Total Orders:</strong></td>
                  <td style="padding: 5px 0;">${vendorOrders.length}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0;"><strong>Total Items:</strong></td>
                  <td style="padding: 5px 0;">${totalItems}</td>
                </tr>
                <tr style="border-top: 2px solid #2EC4B6;">
                  <td style="padding: 10px 0; font-size: 20px; font-weight: bold;">Grand Total:</td>
                  <td style="padding: 10px 0; font-size: 20px; font-weight: bold; color: #2EC4B6;">₹${totalAmount.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Shipping Address</h3>
              <p style="margin: 5px 0;"><strong>${vendorOrders[0]?.shipTo?.fullName || 'N/A'}</strong></p>
              <p style="margin: 5px 0;">${vendorOrders[0]?.shipTo?.address || 'N/A'}</p>
              <p style="margin: 5px 0;">${vendorOrders[0]?.shipTo?.city || ''}, ${vendorOrders[0]?.shipTo?.state || ''} ${vendorOrders[0]?.shipTo?.zip || ''}</p>
              <p style="margin: 5px 0;">Phone: ${vendorOrders[0]?.shipTo?.phone || 'N/A'}</p>
            </div>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <strong>Payment Method:</strong> ${vendorOrders[0]?.payment?.method === 'cod' ? 'Cash on Delivery (COD)' : (vendorOrders[0]?.payment?.method || 'N/A').toUpperCase()}
            </div>

            <p style="text-align: center;">
              <a href="${env.CLIENT_URL}/orders" class="button">View All Your Orders</a>
            </p>

            <p style="margin-top: 30px;">You can track each order separately using the tracking links above.</p>
            <p>Need help? Contact our support team at <a href="mailto:${env.SUPPORT_EMAIL}">${env.SUPPORT_EMAIL}</a> or call ${env.SUPPORT_PHONE}.</p>

            <p><em>- Vtech Team</em></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Vtech. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const orderIds = vendorOrders.map(o => o.orderId).join(', ');
    return this.sendEmail(
      user.email,
      `Order Confirmation - ${vendorOrders.length} Orders (${orderIds})`,
      html
    );
  }

  async sendShippingNotification(user, order) {
    const html = `
      <h1>Your Order Has Shipped!</h1>
      <p>Hi ${user.name},</p>
      <p>Your order ${order.orderId} has been shipped.</p>
      <p>Tracking Number: ${order.shipment.awb}</p>
      <p>Carrier: ${order.shipment.carrier}</p>
    `;

    return this.sendEmail(user.email, 'Order Shipped', html);
  }

  async sendVendorOrderNotification(vendor, order, items) {
    // Generate vendor's items list
    const vendorItemsHtml = items.map(item => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #eee;">
          <strong>${item.name}</strong><br>
          <small style="color: #666;">Qty: ${item.qty}</small>
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right;">
          ₹${(item.priceSnapshot * item.qty).toFixed(2)}
        </td>
      </tr>
    `).join('');

    const totalAmount = items.reduce((sum, item) => sum + (item.priceSnapshot * item.qty), 0);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF9F1C 0%, #2EC4B6 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; }
          .order-box { background: white; border: 2px solid #2EC4B6; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .order-id { font-size: 24px; font-weight: bold; color: #2EC4B6; text-align: center; margin: 20px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .total-row { background: #f0f9ff; font-weight: bold; }
          .button { display: inline-block; background: #FF9F1C; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Order Received!</h1>
          </div>
          <div class="content">
            <p>Hi ${vendor.name},</p>
            <p>Great news! You have received a new order for your products.</p>

            <div class="order-id">Order #${order.orderId}</div>

            <div class="order-box">
              <h3 style="margin-top: 0;">Your Products in This Order</h3>
              <table class="items-table">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 10px; text-align: left;">Product</th>
                    <th style="padding: 10px; text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${vendorItemsHtml}
                  <tr class="total-row">
                    <td style="padding: 15px; font-size: 18px;">Total</td>
                    <td style="padding: 15px; text-align: right; font-size: 18px; color: #2EC4B6;">₹${totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Delivery Address</h3>
              <p style="margin: 5px 0;"><strong>${order.shipTo?.fullName || 'N/A'}</strong></p>
              <p style="margin: 5px 0;">${order.shipTo?.address || 'N/A'}</p>
              <p style="margin: 5px 0;">${order.shipTo?.city || ''}, ${order.shipTo?.state || ''} ${order.shipTo?.zip || ''}</p>
              <p style="margin: 5px 0;">Phone: ${order.shipTo?.phone || 'N/A'}</p>
            </div>

            <div class="alert">
              <strong>Action Required:</strong> Please prepare the products for shipment and update the order status in your vendor dashboard.
            </div>

            <p style="text-align: center;">
              <a href="${env.CLIENT_URL}/vendor-dashboard/orders/${order._id}" class="button">View Order Details</a>
            </p>

            <p style="margin-top: 30px;"><em>- Vtech Shop Team</em></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(vendor.email, `New Order #${order.orderId} - Action Required`, html);
  }

  async sendAdminOrderNotification(order, items, vendorUser, vendorProfile = null) {
    // Calculate total for these specific items
    const totalAmount = items.reduce((sum, item) => sum + (item.priceSnapshot * item.qty), 0);

    // Get vendor display name: prefer store name from profile, fallback to user name
    const vendorDisplayName = vendorProfile?.storeName || vendorUser?.name || 'Unknown Vendor';

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #eee;">
          <strong>${item.name}</strong><br>
          <small style="color: #666;">Qty: ${item.qty}</small>
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right;">
          ₹${(item.priceSnapshot * item.qty).toFixed(2)}
        </td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF9F1C 0%, #2EC4B6 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; }
          .order-box { background: white; border: 2px solid #2EC4B6; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .order-id { font-size: 24px; font-weight: bold; color: #2EC4B6; text-align: center; margin: 20px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .total-row { background: #f0f9ff; font-weight: bold; }
          .button { display: inline-block; background: #FF9F1C; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .stats { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Order Placed</h1>
          </div>
          <div class="content">
            <p>Hi Admin,</p>
            <p>A new order has been placed on Vtech Shop containing products from vendor: <strong>${vendorDisplayName}</strong></p>

            <div class="order-id">Order #${order.orderId}</div>

            <div class="stats">
              <p style="margin: 5px 0;"><strong>Vendor Store:</strong> ${vendorDisplayName}</p>
              <p style="margin: 5px 0;"><strong>Vendor Contact:</strong> ${vendorUser?.email || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Customer:</strong> ${order.shipTo?.fullName || 'N/A'} ${order.isGuest ? '(Guest)' : ''}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${order.guestEmail || 'Registered User'}</p>
              <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${order.payment?.method === 'cod' ? 'Cash on Delivery' : (order.payment?.method || 'N/A').toUpperCase()}</p>
              <p style="margin: 5px 0;"><strong>Vendor Products Total:</strong> ₹${totalAmount.toFixed(2)}</p>
            </div>

            <div class="order-box">
              <h3 style="margin-top: 0;">Vendor Products in This Order</h3>
              <table class="items-table">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 10px; text-align: left;">Product</th>
                    <th style="padding: 10px; text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr class="total-row">
                    <td style="padding: 15px; font-size: 18px;">Vendor Products Total</td>
                    <td style="padding: 15px; text-align: right; font-size: 18px; color: #2EC4B6;">₹${totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Shipping Address</h3>
              <p style="margin: 5px 0;"><strong>${order.shipTo?.fullName || 'N/A'}</strong></p>
              <p style="margin: 5px 0;">${order.shipTo?.address || 'N/A'}</p>
              <p style="margin: 5px 0;">${order.shipTo?.city || ''}, ${order.shipTo?.state || ''} ${order.shipTo?.zip || ''}</p>
              <p style="margin: 5px 0;">Phone: ${order.shipTo?.phone || 'N/A'}</p>
            </div>

            <p style="text-align: center;">
              <a href="${env.CLIENT_URL}/admin-dashboard/orders" class="button">View Order in Admin Panel</a>
            </p>

            <p style="margin-top: 30px;"><em>- Vtech Shop System</em></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = vendorDisplayName !== 'Unknown Vendor'
      ? `New Order #${order.orderId} - ${vendorDisplayName} Products`
      : `New Order #${order.orderId} Received`;

    return this.sendEmail(env.ADMIN_EMAIL, subject, html);
  }

  async sendSMS(phone, message) {
    // Implement SMS via Twilio, SNS, etc.
    logger.info(`SMS to ${phone}: ${message}`);
  }
}

module.exports = new NotificationService();
