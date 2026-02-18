// FILE: apps/api/src/routes/tickets.js
const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

// All routes require authentication
router.use(authenticate);

// Create ticket (Customer, Vendor, Affiliate)
router.post('/', ticketController.createTicket);

// Get all tickets (filtered by role)
router.get('/', ticketController.getTickets);

// Get user-specific ticket statistics (Any authenticated user)
router.get('/my-stats', ticketController.getUserStats);

// Get ticket statistics (Admin only)
router.get('/stats', authorize(['admin']), ticketController.getStats);

// Get single ticket - SECURITY: Added ObjectId validation + ownership check in controller
router.get('/:id', validateObjectId('id'), ticketController.getTicketById);

// Add message to ticket - SECURITY: Added ObjectId validation
router.post('/:id/messages', validateObjectId('id'), ticketController.addMessage);

// Update ticket status (Admin only) - SECURITY: Added ObjectId validation
router.put('/:id/status', validateObjectId('id'), authorize(['admin']), ticketController.updateStatus);

// Assign ticket (Admin only) - SECURITY: Added ObjectId validation
router.put('/:id/assign', validateObjectId('id'), authorize(['admin']), ticketController.assignTicket);

// Update ticket priority (Admin only) - SECURITY: Added ObjectId validation
router.put('/:id/priority', validateObjectId('id'), authorize(['admin']), ticketController.updatePriority);

// Delete ticket (Admin only) - SECURITY: Added ObjectId validation
router.delete('/:id', validateObjectId('id'), authorize(['admin']), ticketController.deleteTicket);

module.exports = router;
