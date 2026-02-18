const ChatbotProvider = require('../../adapters/chatbot/ChatbotProvider');
const RuleBasedProvider = require('../../adapters/chatbot/RuleBasedProvider');

describe('Chatbot Adapters', () => {
  describe('ChatbotProvider (Base)', () => {
    it('should throw error for unimplemented processMessage', async () => {
      const provider = new ChatbotProvider();
      await expect(provider.processMessage('hello', {})).rejects.toThrow(
        'processMessage must be implemented'
      );
    });
  });

  describe('RuleBasedProvider', () => {
    let provider;

    beforeEach(() => {
      provider = new RuleBasedProvider();
    });

    it('should extend ChatbotProvider', () => {
      expect(provider).toBeInstanceOf(ChatbotProvider);
    });

    it('should respond to order tracking queries', async () => {
      const result = await provider.processMessage('How do I track my order?', {});
      expect(result.reply).toContain('Track Order');
      expect(result.confidence).toBe(0.8);
    });

    it('should respond to shipping queries', async () => {
      const result = await provider.processMessage('What are the shipping options?', {});
      expect(result.reply).toContain('shipping');
      expect(result.confidence).toBe(0.8);
    });

    it('should respond to delivery queries', async () => {
      const result = await provider.processMessage('When will my delivery arrive?', {});
      expect(result.reply).toContain('shipping');
    });

    it('should respond to return queries', async () => {
      const result = await provider.processMessage('How do I return a product?', {});
      expect(result.reply).toContain('return');
      expect(result.confidence).toBe(0.8);
    });

    it('should respond to refund queries', async () => {
      const result = await provider.processMessage('I want a refund', {});
      expect(result.reply).toContain('return');
    });

    it('should respond to payment queries', async () => {
      const result = await provider.processMessage('What payment methods do you accept?', {});
      expect(result.reply).toContain('credit');
      expect(result.confidence).toBe(0.8);
    });

    it('should respond to card queries', async () => {
      const result = await provider.processMessage('Can I pay with card?', {});
      expect(result.reply).toContain('credit');
    });

    it('should respond to contact/support queries', async () => {
      const result = await provider.processMessage('How can I contact support?', {});
      expect(result.reply).toContain('support');
      expect(result.confidence).toBe(0.8);
    });

    it('should provide default response for unmatched queries', async () => {
      const result = await provider.processMessage('What is the meaning of life?', {});
      expect(result.reply).toContain("I'm here to help");
      expect(result.confidence).toBe(0.5);
    });

    it('should be case-insensitive', async () => {
      const result = await provider.processMessage('TRACK MY ORDER', {});
      expect(result.confidence).toBe(0.8);
    });

    it('should match partial words', async () => {
      const result = await provider.processMessage('Can I get a refund for this product?', {});
      expect(result.confidence).toBe(0.8);
    });
  });
});
