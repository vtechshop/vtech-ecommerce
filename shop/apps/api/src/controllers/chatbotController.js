// FILE: apps/api/src/controllers/chatbotController.js
const Order = require('../models/Order');
const Product = require('../models/Product');
const logger = require('../config/logger');

// Enhanced rule-based chatbot with context awareness
exports.handleMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    const userId = req.user?._id;
    const lowerMessage = message.toLowerCase();

    let reply = '';

    // Greeting
    if (lowerMessage.match(/\b(hi|hello|hey|greetings)\b/)) {
      reply = 'Hello! 👋 How can I assist you today?\n\nI can help with:\n• Order tracking & status\n• Product recommendations\n• Shipping & delivery info\n• Returns & refunds\n• Payment methods\n• Account questions';
    }
    // Order tracking
    else if (lowerMessage.includes('track') || lowerMessage.includes('order status')) {
      if (userId) {
        try {
          const recentOrder = await Order.findOne({ userId }).sort({ createdAt: -1 });
          if (recentOrder) {
            reply = `📦 Your most recent order #${recentOrder.orderNumber} is currently "${recentOrder.status}".\n\nTotal: ₹${(recentOrder.total / 100).toFixed(2)}\nPlaced: ${new Date(recentOrder.createdAt).toLocaleDateString()}\n\nYou can track your order in your Orders page or visit our Track Order page.`;
          } else {
            reply = 'I couldn\'t find any recent orders for your account. To track an order, please visit our Track Order page and enter your Order ID and email address.';
          }
        } catch (error) {
          reply = 'To track your order, please visit our Track Order page and enter your Order ID and email address.';
        }
      } else {
        reply = 'To track your order, please visit our Track Order page and enter your Order ID and email address, or log in to view your orders.';
      }
    }
    // Product recommendations
    else if (lowerMessage.match(/\b(recommend|suggest|looking for|need|want to buy)\b/)) {
      try {
        const trendingProducts = await Product.find({ isActive: true, stock: { $gt: 0 } })
          .sort({ sold: -1 })
          .limit(3);

        if (trendingProducts.length > 0) {
          reply = '🔥 Here are some of our trending products:\n\n';
          trendingProducts.forEach((product, index) => {
            reply += `${index + 1}. ${product.title}\n   Price: ₹${(product.price / 100).toFixed(2)}\n   Rating: ⭐ ${product.rating || 'New'}\n\n`;
          });
          reply += 'Would you like more recommendations? Just let me know what you\'re interested in!';
        } else {
          reply = 'I\'d love to help you find products! Browse our catalog or tell me what you\'re looking for.';
        }
      } catch (error) {
        reply = 'I\'d be happy to help you find products! Browse our catalog or tell me what category you\'re interested in.';
      }
    }
    // Shipping information
    else if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery')) {
      reply = '🚚 **Shipping Options:**\n\n• **Standard** (5-7 business days) - ₹50\n• **Express** (2-3 business days) - ₹150\n• **Overnight** (next day) - ₹250\n\n✨ **FREE shipping** on orders over ₹500!\n\nAll orders are processed within 24 hours.';
    }
    // Returns & refunds
    else if (lowerMessage.includes('return') || lowerMessage.includes('refund')) {
      reply = '↩️ **Return Policy:**\n\n• Returns accepted within **30 days** of delivery\n• Items must be unused and in original packaging\n• Free return shipping for defective items\n• Refunds processed within 5-7 business days\n\nTo initiate a return, visit your Orders page and click "Request Return" on the order.';
    }
    // Payment methods
    else if (lowerMessage.includes('payment') || lowerMessage.includes('pay')) {
      reply = '💳 **Accepted Payment Methods:**\n\n• Credit/Debit Cards (Visa, Mastercard, RuPay)\n• UPI (GPay, PhonePe, Paytm)\n• Net Banking\n• Digital Wallets\n\n🔒 All payments are secured with 256-bit SSL encryption.';
    }
    // Contact support
    else if (lowerMessage.includes('contact') || lowerMessage.includes('support') || lowerMessage.includes('help')) {
      reply = '📞 **Contact Support:**\n\n• Email: support@vtech-shop.com\n• Phone: 1-800-VTECH-24 (24/7)\n• Live Chat: Right here!\n• Response time: < 2 hours\n\nOur support team is here to help you anytime!';
    }
    // Become vendor/affiliate
    else if (lowerMessage.includes('vendor') || lowerMessage.includes('sell')) {
      reply = '🏪 **Become a Vendor:**\n\nJoin our marketplace and reach thousands of customers!\n\n• Zero listing fees\n• Competitive commission rates\n• Real-time analytics\n• Marketing support\n\nVisit our "Become a Vendor" page to register and start selling!';
    }
    else if (lowerMessage.includes('affiliate')) {
      reply = '💼 **Affiliate Program:**\n\nEarn commission by promoting our products!\n\n• Up to 10% commission\n• 30-day cookie duration\n• Real-time tracking\n• Monthly payouts\n\nClick "Become an Affiliate" to join our program today!';
    }
    // Thanks/bye
    else if (lowerMessage.match(/\b(thank|thanks|bye|goodbye)\b/)) {
      reply = 'You\'re welcome! 😊 Feel free to reach out anytime you need assistance. Happy shopping! 🛍️';
    }
    // Default response
    else {
      reply = 'I\'m here to help! 🤖\n\nYou can ask me about:\n• 📦 Order tracking & status\n• 🔥 Product recommendations\n• 🚚 Shipping & delivery\n• ↩️ Returns & refunds\n• 💳 Payment methods\n• 📞 Contact support\n\nWhat would you like to know?';
    }

    logger.info(`Chatbot message: "${message}" -> "${reply.substring(0, 50)}..."`);

    res.json({
      success: true,
      data: { reply },
    });
  } catch (error) {
    logger.error('Chatbot error:', error);
    next(error);
  }
};