// routes/editorRoutes.js
const express = require('express');
const router = express.Router();
const editorController = require('../controllers/editorController');
const { auth, isEditor } = require('../middleware/auth');  // Updated to use named imports

// Error handler wrapper for async middleware
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Verify middleware is loaded
console.log('Loading editor middleware:', { 
    authExists: typeof auth === 'function',
    isEditorExists: typeof isEditor === 'function'
});

// Apply authentication and editor check to all routes
router.use(asyncHandler(auth));
router.use(isEditor);

// Dashboard
router.get('/dashboard', asyncHandler(async (req, res) => {
    await editorController.getEditorDashboard(req, res);
}));

// Order Management
router.get('/orders/pending', asyncHandler(async (req, res) => {
    await editorController.getPendingOrders(req, res);
}));

router.get('/orders/assigned', asyncHandler(async (req, res) => {
    await editorController.getAssignedOrders(req, res);
}));

router.get('/orders/:orderId', asyncHandler(async (req, res) => {
    await editorController.getOrderDetails(req, res);
}));

router.put('/orders/:orderId/review', asyncHandler(async (req, res) => {
    await editorController.submitReview(req, res);
}));

router.post('/orders/:orderId/approve', asyncHandler(async (req, res) => {
    await editorController.approveWork(req, res);
}));

router.post('/orders/:orderId/reject', asyncHandler(async (req, res) => {
    await editorController.rejectWork(req, res);
}));

// Quality Control
router.post('/orders/:orderId/plagiarism-check', asyncHandler(async (req, res) => {
    await editorController.runPlagiarismCheck(req, res);
}));

router.post('/orders/:orderId/grammar-check', asyncHandler(async (req, res) => {
    await editorController.runGrammarCheck(req, res);
}));

router.post('/orders/:orderId/formatting-check', asyncHandler(async (req, res) => {
    await editorController.checkFormatting(req, res);
}));

// Writer Management
router.get('/writers/performance', asyncHandler(async (req, res) => {
    await editorController.getWriterPerformance(req, res);
}));

router.post('/writers/:writerId/feedback', asyncHandler(async (req, res) => {
    await editorController.provideWriterFeedback(req, res);
}));

router.get('/writers/:writerId/history', asyncHandler(async (req, res) => {
    await editorController.getWriterHistory(req, res);
}));

// Dispute Resolution
router.get('/disputes', asyncHandler(async (req, res) => {
    await editorController.getActiveDisputes(req, res);
}));

router.get('/disputes/:disputeId', asyncHandler(async (req, res) => {
    await editorController.getDisputeDetails(req, res);
}));

router.put('/disputes/:disputeId', asyncHandler(async (req, res) => {
    await editorController.updateDispute(req, res);
}));

router.post('/disputes/:disputeId/resolve', asyncHandler(async (req, res) => {
    await editorController.resolveDispute(req, res);
}));

// Reports & Analytics
router.get('/reports/quality', asyncHandler(async (req, res) => {
    await editorController.getQualityReports(req, res);
}));

router.get('/reports/writer-performance', asyncHandler(async (req, res) => {
    await editorController.getWriterPerformanceReports(req, res);
}));

router.get('/reports/turnaround-time', asyncHandler(async (req, res) => {
    await editorController.getTurnaroundTimeReports(req, res);
}));

// Communication
router.get('/chat/writers', asyncHandler(async (req, res) => {
    await editorController.getWriterChats(req, res);
}));

router.get('/chat/employers', asyncHandler(async (req, res) => {
    await editorController.getEmployerChats(req, res);
}));

router.post('/chat/send', asyncHandler(async (req, res) => {
    await editorController.sendMessage(req, res);
}));

router.get('/notifications', asyncHandler(async (req, res) => {
    await editorController.getNotifications(req, res);
}));

router.put('/notifications/:notificationId', asyncHandler(async (req, res) => {
    await editorController.markNotificationRead(req, res);
}));

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Editor Route Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error in editor route',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

module.exports = router;