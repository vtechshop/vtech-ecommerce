// FILE: apps/api/src/adapters/chatbot/RuleBasedProvider.js
const ChatbotProvider = require('./ChatbotProvider');

class RuleBasedProvider extends ChatbotProvider {
  constructor() {
    super();
    this.rules = [
      {
        patterns: ['track', 'order', 'status'],
        response: 'To track your order, please visit our Track Order page and enter your Order ID and email address.',
      },
      {
        patterns: ['shipping', 'delivery', 'ship'],
        response: 'We offer Standard (5-7 days), Express (2-3 days), and Overnight shipping. Free shipping on orders over ₹500!',
      },
      {
        patterns: ['return', 'refund', 'exchange'],
        response: 'We accept returns within 30 days of delivery. Items must be unused and in original packaging. You can request a return from your Orders page.',
      },
      {
        patterns: ['payment', 'pay', 'card'],
        response: 'We accept credit/debit cards, UPI, and net banking. All payments are processed securely through our payment gateway.',
      },
      {
        patterns: ['contact', 'support', 'help'],
        response: 'You can reach our support team at support@shop.example or call 1-800-SHOP-NOW. We\'re available 24/7!',
      },
    ];
  }

  async processMessage(message, context) {
    const lowerMessage = message.toLowerCase();

    // Find matching rule
    for (const rule of this.rules) {
      if (rule.patterns.some(pattern => lowerMessage.includes(pattern))) {
        return {
          reply: rule.response,
          confidence: 0.8,
        };
      }
    }

    // Default response
    return {
      reply: 'I\'m here to help! You can ask me about orders, shipping, returns, payments, or contact support. What would you like to know?',
      confidence: 0.5,
    };
  }
}

module.exports = RuleBasedProvider;