// FILE: apps/api/src/services/openaiService.js
const OpenAI = require('openai');
const logger = require('../config/logger');

class OpenAIService {
  constructor() {
    // Initialize OpenAI client only if API key is configured
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.enabled = true;
      logger.info('✅ OpenAI service initialized');
    } else {
      this.enabled = false;
      logger.warn('⚠️  OpenAI API key not configured - chatbot will use rule-based responses');
    }
  }

  /**
   * Generate a chatbot response using GPT
   * @param {string} userMessage - The user's message
   * @param {Object} context - Additional context (user info, order history, etc.)
   * @returns {Promise<string>} - AI-generated response
   */
  async generateChatResponse(userMessage, context = {}) {
    if (!this.enabled) {
      throw new Error('OpenAI service not enabled');
    }

    try {
      // Build system prompt with context
      const systemPrompt = this.buildSystemPrompt(context);

      // Call GPT API
      const response = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini', // Cost-effective model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 500,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
      });

      const reply = response.choices[0].message.content.trim();

      logger.info(`OpenAI response generated (${response.usage.total_tokens} tokens)`);

      return reply;
    } catch (error) {
      logger.error('OpenAI API error:', error.message);
      throw error;
    }
  }

  /**
   * Build system prompt with e-commerce context
   */
  buildSystemPrompt(context) {
    const { user, recentOrder, storeInfo } = context;

    let prompt = `You are a helpful customer support assistant for ${storeInfo?.name || 'VTech Kitchen'}, an e-commerce platform specializing in kitchen equipment and appliances.

Your role:
- Answer customer questions about orders, products, shipping, and policies
- Be friendly, professional, and concise
- Use emojis sparingly (1-2 per message)
- Always prioritize customer satisfaction
- If you don't know something, admit it and offer to connect them with human support

Store Information:
- Free shipping on orders over ₹2,000
- Standard delivery: 5-7 business days
- Express delivery: 2-3 business days
- Return policy: 7 days from delivery
- Payment methods: Cards, UPI, Net Banking, Wallets
- Support email: support@vtechkitchen.com
- Support phone: 1-800-VTECH-24 (24/7)

Important Guidelines:
- NEVER make up order numbers or tracking information
- NEVER promise specific delivery dates without checking
- For order-specific questions, ask for order number or direct to dashboard
- Keep responses under 150 words
- Use Indian Rupees (₹) for prices
- Suggest relevant products when appropriate`;

    // Add user context if available
    if (user) {
      prompt += `\n\nCustomer Context:
- Name: ${user.name || 'Valued Customer'}
- Account status: ${user.emailVerified ? 'Verified' : 'Unverified'}`;
    }

    // Add recent order context if available
    if (recentOrder) {
      prompt += `\n\nMost Recent Order:
- Order ID: ${recentOrder.orderId}
- Status: ${recentOrder.status}
- Date: ${new Date(recentOrder.createdAt).toLocaleDateString()}
- Total: ₹${(recentOrder.totals.total / 100).toFixed(2)}`;
    }

    return prompt;
  }

  /**
   * Check if OpenAI service is available
   */
  isEnabled() {
    return this.enabled;
  }
}

// Export singleton instance
module.exports = new OpenAIService();
