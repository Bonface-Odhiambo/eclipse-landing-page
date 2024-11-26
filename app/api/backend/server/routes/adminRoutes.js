// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, isAdmin } = require('../middleware/auth');

// Verify middleware is loaded
console.log('Loading admin middleware:', { 
    authExists: typeof auth === 'function',
    isAdminExists: typeof isAdmin === 'function'
});

// Error handler wrapper for async middleware
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Apply authentication and admin check to all routes
router.use(asyncHandler(auth));
router.use(isAdmin);

// Dashboard & Analytics Routes
router.get('/dashboard/stats', asyncHandler(adminController.getDashboardStats));
router.get('/analytics/revenue', asyncHandler(adminController.getRevenueAnalytics));
router.get('/analytics/users', asyncHandler(adminController.getUserAnalytics));

// User Management Routes
router.get('/users', asyncHandler(adminController.getAllUsers));
router.get('/users/:userId', asyncHandler(adminController.getUserDetails));
router.put('/users/:userId/status', asyncHandler(adminController.updateUserStatus));
router.delete('/users/:userId', asyncHandler(adminController.deleteUser));

// Orders Management Routes
router.get('/orders', asyncHandler(adminController.getAllOrders));
router.get('/orders/:orderId', asyncHandler(adminController.getOrderDetails));
router.put('/orders/:orderId/reassign', asyncHandler(adminController.reassignOrder));
router.put('/orders/:orderId/status', asyncHandler(adminController.updateOrderStatus));

// Writer Management Routes
router.get('/writers', asyncHandler(adminController.getAllWriters));
router.put('/writers/:writerId/verify', asyncHandler(adminController.verifyWriter));
router.put('/writers/:writerId/block', asyncHandler(adminController.blockWriter));

// Payment Management Routes
router.get('/payments', asyncHandler(adminController.getAllPayments));
router.post('/payments/process-pending', asyncHandler(adminController.processPendingPayments));
router.put('/payments/:paymentId/status', asyncHandler(adminController.updatePaymentStatus));

// System Management Routes
router.get('/system/status', asyncHandler(adminController.getSystemStatus));
router.get('/system/logs', asyncHandler(adminController.getSystemLogs));
router.put('/system/settings', asyncHandler(adminController.updateSystemSettings));
router.post('/system/maintenance', asyncHandler(adminController.toggleMaintenanceMode));

// Reports Routes
router.get('/reports/revenue', asyncHandler(adminController.getRevenueReport));
router.get('/reports/user-growth', asyncHandler(adminController.getUserGrowthReport));
router.get('/reports/order-trends', asyncHandler(adminController.getOrderTrendsReport));
router.get('/reports/writer-performance', asyncHandler(adminController.getWriterPerformanceReport));

// Support & Tickets Routes
router.get('/support/tickets', asyncHandler(adminController.getSupportTickets));
router.put('/support/tickets/:ticketId/status', asyncHandler(adminController.updateTicketStatus));
router.post('/support/tickets/:ticketId/reply', asyncHandler(adminController.replyToTicket));

// Error Logging Routes
router.get('/errors', asyncHandler(adminController.getErrorLogs));
router.delete('/errors/:errorId', asyncHandler(adminController.deleteErrorLog));
router.post('/errors/clear-all', asyncHandler(adminController.clearAllErrorLogs));

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Admin Route Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error in admin route',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

module.exports = router;