const express = require('express');
const router = express.Router();
const { auth, writerOnly } = require('../middleware/auth');
const writerController = require('../controllers/writerController');
const { upload, handleUploadError } = require('../middleware/fileUpload');

// Local implementation of asyncHandler
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware to check if auth and writerOnly are functions
const validateMiddleware = (middleware, name) => (req, res, next) => {
    if (typeof middleware !== 'function') {
        console.error(`${name} middleware is not a function:`, middleware);
        return res.status(500).json({ error: 'Server configuration error' });
    }
    return middleware(req, res, next);
};

// Apply authentication and writer-only middleware
router.use(validateMiddleware(auth, 'Auth'));
router.use(validateMiddleware(writerOnly, 'WriterOnly'));

// Dashboard & Stats
router.get(
    '/dashboard/stats', 
    validateMiddleware(asyncHandler(writerController.getDashboardStats), 'getDashboardStats')
);
router.get(
    '/earnings/analytics', 
    validateMiddleware(asyncHandler(writerController.getEarningsAnalytics), 'getEarningsAnalytics')
);

// Order Management
router.get(
    '/orders/available', 
    validateMiddleware(asyncHandler(writerController.getAvailableOrders), 'getAvailableOrders')
);
router.get(
    '/orders/my-orders', 
    validateMiddleware(asyncHandler(writerController.getMyOrders), 'getMyOrders')
);
router.post(
    '/orders/:orderId/bid', 
    validateMiddleware(asyncHandler(writerController.placeBid), 'placeBid')
);
router.post(
    '/orders/:orderId/submit',
    upload.array('files'),
    handleUploadError,
    validateMiddleware(asyncHandler(writerController.submitOrder), 'submitOrder')
);
router.post(
    '/orders/:orderId/submit-revision',
    upload.array('files'),
    handleUploadError,
    validateMiddleware(asyncHandler(writerController.submitRevision), 'submitRevision')
);

// Q&A Platform
router.get(
    '/qa/questions', 
    validateMiddleware(asyncHandler(writerController.getQuestions), 'getQuestions')
);
router.post(
    '/qa/answer', 
    validateMiddleware(asyncHandler(writerController.submitAnswer), 'submitAnswer')
);
router.get(
    '/qa/my-answers', 
    validateMiddleware(asyncHandler(writerController.getMyAnswers), 'getMyAnswers')
);
router.get(
    '/qa/earnings', 
    validateMiddleware(asyncHandler(writerController.getQAEarnings), 'getQAEarnings')
);

// Wallet & Payments
router.get(
    '/wallet/balance', 
    validateMiddleware(asyncHandler(writerController.getWalletBalance), 'getWalletBalance')
);
router.post(
    '/wallet/withdraw', 
    validateMiddleware(asyncHandler(writerController.requestWithdrawal), 'requestWithdrawal')
);
router.get(
    '/wallet/transactions', 
    validateMiddleware(asyncHandler(writerController.getTransactions), 'getTransactions')
);

// Subscription
router.post(
    '/subscription', 
    validateMiddleware(asyncHandler(writerController.processSubscription), 'processSubscription')
);
router.get(
    '/subscription/status', 
    validateMiddleware(asyncHandler(writerController.getSubscriptionStatus), 'getSubscriptionStatus')
);

// File Management
router.post(
    '/orders/:orderId/files',
    upload.array('files', 5),
    handleUploadError,
    validateMiddleware(asyncHandler(writerController.handleFileUpload), 'handleFileUpload')
);
router.delete(
    '/files/:fileId', 
    validateMiddleware(asyncHandler(writerController.deleteFile), 'deleteFile')
);

// Profile & Settings
router.put(
    '/profile', 
    validateMiddleware(asyncHandler(writerController.updateProfile), 'updateProfile')
);
router.put(
    '/expertise', 
    validateMiddleware(asyncHandler(writerController.updateExpertise), 'updateExpertise')
);
router.put(
    '/workload', 
    validateMiddleware(asyncHandler(writerController.updateWorkload), 'updateWorkload')
);

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'An unexpected error occurred',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

module.exports = router;