// FILE: apps/api/src/routes/tickets.js
const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Create ticket (Customer, Vendor, Affiliate)
router.post('/', ticketController.createTicket);

// Get all tickets (filtered by role)
router.get('/', ticketController.getTickets);

// Get ticket statistics (Admin only)
router.get('/stats', authorize(['admin']), ticketController.getStats);

// Get single ticket
router.get('/:id', ticketController.getTicketById);

// Add message to ticket
router.post('/:id/messages', ticketController.addMessage);

// Update ticket status (Admin only)
router.put('/:id/status', authorize(['admin']), ticketController.updateStatus);

// Assign ticket (Admin only)
router.put('/:id/assign', authorize(['admin']), ticketController.assignTicket);

// Update ticket priority (Admin only)
router.put('/:id/priority', authorize(['admin']), ticketController.updatePriority);

// Delete ticket (Admin only)
router.delete('/:id', authorize(['admin']), ticketController.deleteTicket);

module.exports = router;
