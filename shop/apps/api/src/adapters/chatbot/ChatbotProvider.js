// FILE: apps/api/src/adapters/chatbot/ChatbotProvider.js
// Base chatbot provider interface
class ChatbotProvider {
  async processMessage(message, context) {
    throw new Error('processMessage must be implemented');
  }
}

module.exports = ChatbotProvider;