const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// Get all orders (Admin use)
router.get('/', protect, OrderController.getOrders);

// Create a new order
router.post('/', protect, OrderController.createOrder);

// Middleware for handling errors
router.use(OrderController.handleOrderError);

module.exports = router;
