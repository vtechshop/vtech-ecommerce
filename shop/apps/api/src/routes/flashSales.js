// FILE: apps/api/src/routes/flashSales.js
const express = require('express');
const router = express.Router();
const flashSaleController = require('../controllers/flashSaleController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes
router.get('/active', flashSaleController.getActiveFlashSales);
router.get('/:id', flashSaleController.getFlashSaleById);
router.get('/product/:productId', flashSaleController.getProductFlashSale);

// Admin routes
router.get('/', authenticate, authorize(['admin']), flashSaleController.getAllFlashSales);
router.post('/', authenticate, authorize(['admin']), flashSaleController.createFlashSale);
router.put('/:id', authenticate, authorize(['admin']), flashSaleController.updateFlashSale);
router.delete('/:id', authenticate, authorize(['admin']), flashSaleController.deleteFlashSale);

module.exports = router;
