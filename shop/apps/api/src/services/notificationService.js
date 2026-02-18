// FILE: apps/api/src/services/notificationService.js
const { MailerSend, EmailParams, Sender, Recipient, Attachment } = require('mailersend');
const env = require('../config/env');
const logger = require('../config/logger');
const { generateInvoiceBuffer, buildSellerFromVendor } = require('./invoiceService');

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

  async sendEmail(to, subject, html, text, attachments) {
    if (!this.isConfigured || !this.mailerSend) {
      logger.warn('Cannot send email - MailerSend not configured:', { to, subject });
      return { success: false, reason: 'MAILERSEND_NOT_CONFIGURED', messageId: null };
    }

    try {
      // Parse from email and name
      const fromMatch = env.MAIL_FROM.match(/^(.+?)\s*<(.+?)>$/);
      const fromName = fromMatch ? fromMatch[1].trim() : 'V-Tech';
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

      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        emailParams.setAttachments(attachments);
      }

      const response = await this.mailerSend.email.send(emailParams);

      logger.info(`Email sent successfully to ${to}${attachments?.length ? ` with ${attachments.length} attachment(s)` : ''}`);
      return { success: true, messageId: response.headers?.['x-message-id'] || 'sent' };
    } catch (error) {
      logger.error('Email send failed:', error);
      return { success: false, error: error.message, messageId: null };
    }
  }

  async sendOrderConfirmation(user, order) {
    // Generate invoice PDF attachment with correct seller details
    let attachments = [];
    try {
      let seller = null;
      if (order.isVendorOrder && order.items?.[0]?.vendorId) {
        const Vendor = require('../models/Vendor');
        const vendor = await Vendor.findById(order.items[0].vendorId).populate('userId', 'email').lean();
        if (vendor) seller = buildSellerFromVendor(vendor);
      }
      const invoiceBuffer = await generateInvoiceBuffer(order, seller);
      const attachment = new Attachment(
        invoiceBuffer.toString('base64'),
        `Invoice-${order.orderId}.pdf`
      );
      attachments.push(attachment);
    } catch (err) {
      logger.warn(`Failed to generate invoice PDF for order ${order.orderId}:`, err.message);
    }

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

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2EC4B6;">
              <h3 style="margin-top: 0; color: #2EC4B6;">📍 Shipping Address</h3>
              <p style="margin: 5px 0;"><strong>${order.shipTo?.fullName || 'N/A'}</strong></p>
              <p style="margin: 5px 0;">${order.shipTo?.addressLine1 || ''}</p>
              ${order.shipTo?.addressLine2 ? `<p style="margin: 5px 0;">${order.shipTo.addressLine2}</p>` : ''}
              <p style="margin: 5px 0;">${order.shipTo?.city || ''}, ${order.shipTo?.state || ''} ${order.shipTo?.zipCode || ''}</p>
              ${order.shipTo?.country ? `<p style="margin: 5px 0;">${order.shipTo.country}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Phone:</strong> ${order.shipTo?.phone || 'N/A'}</p>
            </div>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <strong>Payment Method:</strong> ${(order.payment?.method || 'N/A').toUpperCase()}
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

    return this.sendEmail(user.email, `Order Confirmation - ${order.orderId}`, html, null, attachments);
  }

  async sendMultiVendorOrderConfirmation(user, vendorOrders, totalAmount) {
    // Guard against empty vendorOrders
    if (!vendorOrders || vendorOrders.length === 0) {
      logger.warn('sendMultiVendorOrderConfirmation called with empty vendorOrders');
      return { success: false, reason: 'NO_ORDERS' };
    }

    // Generate invoice PDF attachments for each vendor order (with correct seller details)
    const Vendor = require('../models/Vendor');
    const attachments = [];
    for (const vOrder of vendorOrders) {
      try {
        let seller = null;
        if (vOrder.isVendorOrder && vOrder.items?.[0]?.vendorId) {
          const vendor = await Vendor.findById(vOrder.items[0].vendorId).populate('userId', 'email').lean();
          if (vendor) seller = buildSellerFromVendor(vendor);
        }
        const invoiceBuffer = await generateInvoiceBuffer(vOrder, seller);
        attachments.push(new Attachment(
          invoiceBuffer.toString('base64'),
          `Invoice-${vOrder.orderId}.pdf`
        ));
      } catch (err) {
        logger.warn(`Failed to generate invoice PDF for order ${vOrder.orderId}:`, err.message);
      }
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
              <p style="margin: 5px 0;">${vendorOrders[0]?.shipTo?.addressLine1 || ''}</p>
              ${vendorOrders[0]?.shipTo?.addressLine2 ? `<p style="margin: 5px 0;">${vendorOrders[0].shipTo.addressLine2}</p>` : ''}
              <p style="margin: 5px 0;">${vendorOrders[0]?.shipTo?.city || ''}, ${vendorOrders[0]?.shipTo?.state || ''} ${vendorOrders[0]?.shipTo?.zipCode || ''}</p>
              ${vendorOrders[0]?.shipTo?.country ? `<p style="margin: 5px 0;">${vendorOrders[0].shipTo.country}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Phone:</strong> ${vendorOrders[0]?.shipTo?.phone || 'N/A'}</p>
            </div>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <strong>Payment Method:</strong> ${(vendorOrders[0]?.payment?.method || 'N/A').toUpperCase()}
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
      html,
      null,
      attachments
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
    // Get vendor email and name - handle both populated userId and direct fields
    const vendorEmail = vendor.userId?.email || vendor.email;
    const vendorName = vendor.userId?.name || vendor.storeName || 'Vendor';

    if (!vendorEmail) {
      logger.warn(`Cannot send vendor notification - no email found for vendor ${vendor._id}`);
      return { success: false, reason: 'NO_VENDOR_EMAIL' };
    }

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
            <p>Hi ${vendorName},</p>
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

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2EC4B6;">
              <h3 style="margin-top: 0; color: #2EC4B6;">📍 Delivery Address</h3>
              <p style="margin: 5px 0;"><strong>${order.shipTo?.fullName || 'N/A'}</strong></p>
              <p style="margin: 5px 0;">${order.shipTo?.addressLine1 || ''}</p>
              ${order.shipTo?.addressLine2 ? `<p style="margin: 5px 0;">${order.shipTo.addressLine2}</p>` : ''}
              <p style="margin: 5px 0;">${order.shipTo?.city || ''}, ${order.shipTo?.state || ''} ${order.shipTo?.zipCode || ''}</p>
              ${order.shipTo?.country ? `<p style="margin: 5px 0;">${order.shipTo.country}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Phone:</strong> ${order.shipTo?.phone || 'N/A'}</p>
            </div>

            <div class="alert">
              <strong>Action Required:</strong> Please prepare the products for shipment and update the order status in your vendor dashboard.
            </div>

            <p style="text-align: center;">
              <a href="${env.CLIENT_URL}/vendor-dashboard/orders/${order._id}" class="button">View Order Details</a>
            </p>

            <p style="margin-top: 30px;"><em>- V-Tech Team</em></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(vendorEmail, `New Order #${order.orderId} - Action Required`, html);
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
            <p>A new order has been placed on V-Tech containing products from vendor: <strong>${vendorDisplayName}</strong></p>

            <div class="order-id">Order #${order.orderId}</div>

            <div class="stats">
              <p style="margin: 5px 0;"><strong>Vendor Store:</strong> ${vendorDisplayName}</p>
              <p style="margin: 5px 0;"><strong>Vendor Contact:</strong> ${vendorUser?.email || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Customer:</strong> ${order.shipTo?.fullName} ${order.isGuest ? '(Guest)' : ''}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${order.guestEmail || order.userId?.email || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${(order.payment?.method || 'N/A').toUpperCase()}</p>
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

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2EC4B6;">
              <h3 style="margin-top: 0; color: #2EC4B6;">📍 Shipping Address</h3>
              <p style="margin: 5px 0;"><strong>${order.shipTo?.fullName || 'N/A'}</strong></p>
              <p style="margin: 5px 0;">${order.shipTo?.addressLine1 || ''}</p>
              ${order.shipTo?.addressLine2 ? `<p style="margin: 5px 0;">${order.shipTo.addressLine2}</p>` : ''}
              <p style="margin: 5px 0;">${order.shipTo?.city || ''}, ${order.shipTo?.state || ''} ${order.shipTo?.zipCode || ''}</p>
              ${order.shipTo?.country ? `<p style="margin: 5px 0;">${order.shipTo.country}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Phone:</strong> ${order.shipTo?.phone || 'N/A'}</p>
            </div>

            <p style="text-align: center;">
              <a href="${env.CLIENT_URL}/admin-dashboard/orders" class="button">View Order in Admin Panel</a>
            </p>

            <p style="margin-top: 30px;"><em>- V-Tech System</em></p>
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

  /**
   * Send order cancellation email to customer
   */
  async sendOrderCancellationEmail(user, order, reason, cancelledBy = 'customer') {
    const customerEmail = user.email || order.guestEmail;
    const customerName = user.name || order.shipTo?.fullName || 'Customer';

    if (!customerEmail) {
      logger.warn(`Cannot send cancellation email - no email found for order ${order.orderId}`);
      return { success: false, reason: 'NO_CUSTOMER_EMAIL' };
    }

    const cancelledByText = cancelledBy === 'admin' ? 'by the store admin' :
                            cancelledBy === 'vendor' ? 'by the vendor' : 'as per your request';

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.qty}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(item.priceSnapshot * item.qty).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; }
          .order-box { background: white; border: 2px solid #dc3545; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .order-id { font-size: 24px; font-weight: bold; color: #dc3545; text-align: center; margin: 20px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .button { display: inline-block; background: #FF9F1C; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .reason-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Cancelled</h1>
          </div>
          <div class="content">
            <p>Hi ${customerName},</p>
            <p>Your order has been cancelled ${cancelledByText}.</p>

            <div class="order-id">Order #${order.orderId}</div>

            <div class="reason-box">
              <strong>Cancellation Reason:</strong><br>
              ${reason || 'No reason provided'}
            </div>

            <div class="order-box">
              <h3 style="margin-top: 0;">Cancelled Items</h3>
              <table class="items-table">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 10px; text-align: left;">Product</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <p>If payment was already made, a refund will be processed within 5-7 business days.</p>

            <p>If you have any questions, please contact our support team.</p>

            <p style="text-align: center;">
              <a href="${env.CLIENT_URL}/orders/${order.orderId}" class="button">View Order Details</a>
            </p>

            <p style="margin-top: 30px;"><em>- V-Tech Team</em></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(customerEmail, `Order #${order.orderId} Cancelled`, html);
  }

  /**
   * Send order cancellation email to vendor
   */
  async sendVendorOrderCancellationEmail(vendor, order, vendorItems, reason, cancelledBy = 'customer') {
    const vendorEmail = vendor.userId?.email || vendor.email;
    const vendorName = vendor.userId?.name || vendor.storeName || 'Vendor';

    if (!vendorEmail) {
      logger.warn(`Cannot send vendor cancellation email - no email found for vendor ${vendor._id}`);
      return { success: false, reason: 'NO_VENDOR_EMAIL' };
    }

    const cancelledByText = cancelledBy === 'admin' ? 'by the admin' : 'by the customer';
    const totalAmount = vendorItems.reduce((sum, item) => sum + (item.priceSnapshot * item.qty), 0);

    const itemsHtml = vendorItems.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.qty}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(item.priceSnapshot * item.qty).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; }
          .order-box { background: white; border: 2px solid #dc3545; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .order-id { font-size: 24px; font-weight: bold; color: #dc3545; text-align: center; margin: 20px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .button { display: inline-block; background: #FF9F1C; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .reason-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Cancelled</h1>
          </div>
          <div class="content">
            <p>Hi ${vendorName},</p>
            <p>An order containing your products has been cancelled ${cancelledByText}.</p>

            <div class="order-id">Order #${order.orderId}</div>

            <div class="reason-box">
              <strong>Cancellation Reason:</strong><br>
              ${reason || 'No reason provided'}
            </div>

            <div class="order-box">
              <h3 style="margin-top: 0;">Your Cancelled Products</h3>
              <table class="items-table">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 10px; text-align: left;">Product</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr style="background: #f0f9ff; font-weight: bold;">
                    <td colspan="2" style="padding: 15px;">Total</td>
                    <td style="padding: 15px; text-align: right; color: #dc3545;">₹${totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>Stock has been automatically restored for these items.</p>

            <p style="text-align: center;">
              <a href="${env.CLIENT_URL}/vendor-dashboard/orders" class="button">View Orders</a>
            </p>

            <p style="margin-top: 30px;"><em>- V-Tech Team</em></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(vendorEmail, `Order #${order.orderId} Cancelled`, html);
  }

  /**
   * Send order status update email to customer
   */
  async sendOrderStatusUpdateEmail(user, order, newStatus, trackingInfo = null) {
    const customerEmail = user.email || order.guestEmail;
    const customerName = user.name || order.shipTo?.fullName || 'Customer';

    if (!customerEmail) {
      logger.warn(`Cannot send status update email - no email found for order ${order.orderId}`);
      return { success: false, reason: 'NO_CUSTOMER_EMAIL' };
    }

    const statusConfig = {
      packed: {
        title: 'Order Packed',
        color: '#17a2b8',
        icon: '📦',
        message: 'Your order has been packed and is ready for shipping.',
      },
      shipped: {
        title: 'Order Shipped',
        color: '#007bff',
        icon: '🚚',
        message: 'Your order is on the way! Track your shipment below.',
      },
      out_for_delivery: {
        title: 'Out for Delivery',
        color: '#fd7e14',
        icon: '🏃',
        message: 'Your order is out for delivery and will arrive soon!',
      },
      delivered: {
        title: 'Order Delivered',
        color: '#28a745',
        icon: '✅',
        message: 'Your order has been delivered. Enjoy your purchase!',
      },
    };

    const config = statusConfig[newStatus] || {
      title: `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      color: '#6c757d',
      icon: '📋',
      message: `Your order status has been updated to: ${newStatus}`,
    };

    const trackingHtml = trackingInfo ? `
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${config.color};">
        <h3 style="margin-top: 0; color: ${config.color};">📍 Tracking Information</h3>
        <p style="margin: 5px 0;"><strong>Carrier:</strong> ${trackingInfo.carrier || 'N/A'}</p>
        <p style="margin: 5px 0;"><strong>AWB Number:</strong> ${trackingInfo.awb || 'N/A'}</p>
        ${trackingInfo.trackingUrl ? `<p style="margin: 10px 0;"><a href="${trackingInfo.trackingUrl}" style="color: ${config.color};">Track your package →</a></p>` : ''}
      </div>
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; }
          .order-id { font-size: 24px; font-weight: bold; color: ${config.color}; text-align: center; margin: 20px 0; }
          .status-icon { font-size: 48px; text-align: center; margin: 20px 0; }
          .button { display: inline-block; background: #FF9F1C; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${config.title}</h1>
          </div>
          <div class="content">
            <p>Hi ${customerName},</p>

            <div class="status-icon">${config.icon}</div>

            <p style="text-align: center; font-size: 18px;">${config.message}</p>

            <div class="order-id">Order #${order.orderId}</div>

            ${trackingHtml}

            <p style="text-align: center;">
              <a href="${env.CLIENT_URL}/orders/${order.orderId}" class="button">View Order Details</a>
            </p>

            <p style="margin-top: 30px;"><em>- V-Tech Team</em></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(customerEmail, `${config.icon} Order #${order.orderId} - ${config.title}`, html);
  }

  async sendSMS(phone, message) {
    // Implement SMS via Twilio, SNS, etc.
    logger.info(`SMS to ${phone}: ${message}`);
  }

  /**
   * Send transfer/account status alert emails
   * Used for: transfer failures, account activation, account suspension
   */
  async sendTransferAlert(email, name, details) {
    let subject, bodyContent;

    switch (details.type) {
      case 'transfer_failed':
        subject = `Payment Transfer Failed - Action Required`;
        bodyContent = `
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <strong style="color: #dc2626;">Transfer Failed</strong>
          </div>
          <p>Hi ${name},</p>
          <p>A payment transfer to your account has failed. The platform team has been notified and will process this manually.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Amount</td><td style="padding: 8px; border-bottom: 1px solid #eee;">₹${details.amount?.toFixed(2) || '0.00'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Reason</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${details.failureReason || 'Unknown'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Store</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${details.storeName || 'N/A'}</td></tr>
          </table>
          <p>No action is needed from your end. The amount will be retried or processed manually.</p>
        `;
        break;

      case 'transfer_failed_admin':
        subject = `[ADMIN] Transfer Failed - ${details.commissionType} commission`;
        bodyContent = `
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <strong style="color: #dc2626;">Transfer Failed - Manual Action May Be Required</strong>
          </div>
          <p>Hi ${name},</p>
          <p>A Razorpay Route transfer has failed and needs attention.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Transfer ID</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${details.transferId || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Type</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${details.commissionType}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Amount</td><td style="padding: 8px; border-bottom: 1px solid #eee;">₹${details.amount?.toFixed(2) || '0.00'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Reason</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${details.failureReason || 'Unknown'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Subject ID</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${details.subjectId}</td></tr>
          </table>
          <p style="text-align: center;">
            <a href="${env.CLIENT_URL}/admin-dashboard/payouts" style="display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Review in Dashboard</a>
          </p>
        `;
        break;

      case 'account_status':
        const statusColors = {
          activated: '#16a34a',
          suspended: '#dc2626',
          under_review: '#ca8a04',
          funds_hold: '#ca8a04',
          funds_unhold: '#16a34a',
        };
        const color = statusColors[details.status] || '#6b7280';
        subject = `Razorpay Account ${details.status.charAt(0).toUpperCase() + details.status.slice(1)} - ${details.storeName}`;
        bodyContent = `
          <div style="background: ${color}15; border-left: 4px solid ${color}; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <strong style="color: ${color};">Account Status: ${details.status.toUpperCase()}</strong>
          </div>
          <p>Hi ${name},</p>
          <p>Your Razorpay linked account status has been updated to <strong>${details.status}</strong>.</p>
          ${details.status === 'activated' ? '<p style="color: #16a34a; font-weight: bold;">Your account is now active and payments will be automatically transferred to your bank account.</p>' : ''}
          ${details.status === 'suspended' ? '<p style="color: #dc2626;">Please contact support if you believe this is an error. Payments will be held until the account is reactivated.</p>' : ''}
          <p style="text-align: center;">
            <a href="${env.CLIENT_URL}/vendor-dashboard/settlements" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">View Settlements</a>
          </p>
        `;
        break;

      default:
        logger.warn(`Unknown transfer alert type: ${details.type}`);
        return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #011627; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">V-Tech Payment Alert</h2>
          </div>
          <div class="content">
            ${bodyContent}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} V-Tech. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, subject, html);
  }
}

module.exports = new NotificationService();
