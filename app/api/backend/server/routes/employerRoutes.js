// routes/employerRoutes.js
const express = require('express');
const router = express.Router();
const { auth, isEmployer } = require('../middleware/auth');
const employerController = require('../controllers/employerController');
const { upload, handleUploadError } = require('../middleware/fileUpload');

// Error handler wrapper for async routes
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Verify middleware is loaded
console.log('Loading employer middleware:', { 
    authExists: typeof auth === 'function',
    isEmployerExists: typeof isEmployer === 'function'
});

// Apply middleware to all routes
router.use(asyncHandler(auth));
router.use(isEmployer);

// Dashboard & Analytics
router.get('/dashboard/stats', 
    asyncHandler(employerController.getDashboardStats)
);

// Order Management
router.post('/orders', 
    upload.array('files', 5),  // Allow up to 5 files
    handleUploadError,         // Handle upload errors
    asyncHandler(employerController.createOrder)
);

router.get('/orders', 
    asyncHandler(async (req, res) => {
        // Temporary handler until getAllOrders is implemented
        res.status(501).json({
            success: false,
            message: 'Route not implemented'
        });
    })
);

router.get('/orders/:orderId', 
    asyncHandler(async (req, res) => {
        // Temporary handler until getOrderDetails is implemented
        res.status(501).json({
            success: false,
            message: 'Route not implemented'
        });
    })
);

router.put('/orders/:orderId/status', 
    asyncHandler(async (req, res) => {
        // Temporary handler until updateOrderStatus is implemented
        res.status(501).json({
            success: false,
            message: 'Route not implemented'
        });
    })
);

router.post('/orders/:orderId/dispute', 
    asyncHandler(async (req, res) => {
        // Temporary handler until createDispute is implemented
        res.status(501).json({
            success: false,
            message: 'Route not implemented'
        });
    })
);

router.post('/orders/:orderId/files', 
    upload.array('files', 10),  // Allow up to 10 files
    handleUploadError,         // Handle upload errors
    asyncHandler(employerController.handleFileUpload)
);

router.delete('/orders/:orderId/files/:fileId', 
    asyncHandler(employerController.deleteFile)
);

// Writer Management
router.get('/writers', 
    asyncHandler(async (req, res) => {
        // Temporary handler until getWriters is implemented
        res.status(501).json({
            success: false,
            message: 'Route not implemented'
        });
    })
);

router.post('/writers/private', 
    asyncHandler(employerController.managePrivateWriters)
);

router.get('/writers/:writerId/profile', 
    asyncHandler(async (req, res) => {
        // Temporary handler until getWriterProfile is implemented
        res.status(501).json({
            success: false,
            message: 'Route not implemented'
        });
    })
);

router.post('/writers/:writerId/rate', 
    asyncHandler(async (req, res) => {
        // Temporary handler until rateWriter is implemented
        res.status(501).json({
            success: false,
            message: 'Route not implemented'
        });
    })
);

// Payment & Wallet
router.post('/wallet/deposit', 
    asyncHandler(employerController.processPayment)
);

router.get('/wallet/transactions', 
    asyncHandler(async (req, res) => {
        // Temporary handler until getTransactions is implemented
        res.status(501).json({
            success: false,
            message: 'Route not implemented'
        });
    })
);

router.get('/payments/:paymentId/status', 
    asyncHandler(employerController.checkPaymentStatus)
);

router.post('/payments/callback', 
    asyncHandler(employerController.handleMpesaCallback)
);

// Subscription Management
router.post('/subscription', 
    asyncHandler(async (req, res) => {
        // Temporary handler until manageSubscription is implemented
        res.status(501).json({
            success: false,
            message: 'Route not implemented'
        });
    })
);

router.get('/subscription/status', 
    asyncHandler(async (req, res) => {
        // Temporary handler until getSubscriptionStatus is implemented
        res.status(501).json({
            success: false,
            message: 'Route not implemented'
        });
    })
);

// Q&A Platform
router.get('/qa/questions', 
    asyncHandler(async (req, res) => {
        // Temporary handler until getQuestions is implemented
        res.status(501).json({
            success: false,
            message: 'Route not implemented'
        });
    })
);

router.get('/qa/answers', 
    asyncHandler(async (req, res) => {
        // Temporary handler until getAnswers is implemented
        res.status(501).json({
            success: false,
            message: 'Route not implemented'
        });
    })
);

router.post('/qa/purchase/:answerId', 
    asyncHandler(async (req, res) => {
        // Temporary handler until purchaseAnswer is implemented
        res.status(501).json({
            success: false,
            message: 'Route not implemented'
        });
    })
);

router.get('/qa/purchased', 
    asyncHandler(async (req, res) => {
        // Temporary handler until getPurchasedAnswers is implemented
        res.status(501).json({
            success: false,
            message: 'Route not implemented'
        });
    })
);

// File Management
router.get('/files/:filename', 
    asyncHandler(employerController.getFile)
);

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Employer Route Error:', err);
    
    // Handle Multer errors specifically
    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            message: err.message,
            code: err.code
        });
    }

    // Handle other errors
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error in employer route',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

module.exports = router;