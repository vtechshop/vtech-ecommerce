// FILE: apps/api/src/utils/email-templates.js
const orderConfirmationTemplate = (order, user) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .order-details { background: white; padding: 15px; margin: 20px 0; border-radius: 8px; }
    .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .total { font-size: 18px; font-weight: bold; margin-top: 15px; }
    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Confirmation</h1>
    </div>
    <div class="content">
      <p>Hi ${user.name},</p>
      <p>Thank you for your order! We're getting it ready to ship.</p>
      
      <div class="order-details">
        <h3>Order #${order.orderId}</h3>
        <p>Order Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
        
        <div style="margin-top: 20px;">
          ${order.items.map(item => `
            <div class="item">
              <span>${item.name} x ${item.qty}</span>
              <span>$${(item.priceSnapshot * item.qty).toFixed(2)}</span>
            </div>
          `).join('')}
          
          <div class="item">
            <span>Subtotal</span>
            <span>$${order.totals.subtotal.toFixed(2)}</span>
          </div>
          <div class="item">
            <span>Tax</span>
            <span>$${order.totals.tax.toFixed(2)}</span>
          </div>
          <div class="item">
            <span>Shipping</span>
            <span>$${order.totals.shipping.toFixed(2)}</span>
          </div>
          <div class="item total">
            <span>Total</span>
            <span>$${order.totals.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <p><strong>Shipping Address:</strong></p>
      <p>
        ${order.shipTo.fullName}<br>
        ${order.shipTo.addressLine1}<br>
        ${order.shipTo.city}, ${order.shipTo.state} ${order.shipTo.zipCode}<br>
        ${order.shipTo.country}
      </p>
      
      <center>
        <a href="${process.env.CLIENT_URL}/dashboard/orders/${order._id}" class="button">
          View Order Details
        </a>
      </center>
    </div>
    <div class="footer">
      <p>Shop - Your Trusted Marketplace</p>
      <p>If you have any questions, contact us at support@shop.example</p>
    </div>
  </div>
</body>
</html>
  `;
};

const shippingNotificationTemplate = (order, user) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .tracking-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
    .tracking-number { font-size: 24px; font-weight: bold; color: #2563eb; margin: 15px 0; }
    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 Your Order Has Shipped!</h1>
    </div>
    <div class="content">
      <p>Hi ${user.name},</p>
      <p>Great news! Your order #${order.orderId} has been shipped and is on its way to you.</p>
      
      <div class="tracking-box">
        <p><strong>Carrier:</strong> ${order.shipment.carrier}</p>
        <p><strong>Tracking Number:</strong></p>
        <div class="tracking-number">${order.shipment.awb}</div>
        <a href="${process.env.CLIENT_URL}/orders/track?orderId=${order.orderId}&email=${user.email}" class="button">
          Track Your Package
        </a>
      </div>
      
      <p>You can track your package using the tracking number above or by clicking the button.</p>
    </div>
    <div class="footer">
      <p>Shop - Your Trusted Marketplace</p>
      <p>Questions? Contact us at support@shop.example</p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = {
  orderConfirmationTemplate,
  shippingNotificationTemplate,
};