const express = require('express');
const router = express.Router();
const { processOrderPayment, initiateAnswerPurchase, initiateWithdrawal } = require('../controllers/paymentController');
const { verifyAuth } = require('../middleware/authMiddleware');

// Payment routes
router.post('/order/:orderId/pay', verifyAuth, processOrderPayment);
router.post('/answer/purchase', verifyAuth, initiateAnswerPurchase);
router.post('/wallet/withdraw', verifyAuth, initiateWithdrawal);

module.exports = router;
