const Order = require('../models/orderModels');
const User = require('../models/userModels');
const Payment = require('../models/paymentModels');
const intaSendService = require('../services/intaSendService');
const notificationService = require('../services/notificationService');
const reportService = require('../services/reportService');
const { getConnection } = require('../config/database');
const cron = require('node-cron');
const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'order-logs.log' }),
        new winston.transports.File({ filename: 'payment-logs.log', level: 'info' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Constants
const WRITER_FEE_PERCENTAGE = 0.07; // 7% for non-subscribed writers
const EDITOR_PAGE_RATE = 5; // KSH 5 per page

// Helper Functions
function isPayDay() {
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return today.getDate() === 15 || today.getDate() === lastDayOfMonth;
}

async function updateAnalytics(type, data, session) {
    try {
        await Analytics.create([{
            type,
            data,
            timestamp: new Date()
        }], { session });
    } catch (error) {
        logger.error('Error updating analytics:', error);
    }
}

async function recordMetric(type, value, session) {
    try {
        await SystemMetrics.create([{
            type,
            value,
            timestamp: new Date()
        }], { session });
    } catch (error) {
        logger.error('Error recording metric:', error);
    }
}

//get All Orders
exports.getOrders = async (req, res) => {
    try {
      const orders = await Order.find();
      res.json(orders);
    } catch (error) {
      logger.error('Error retrieving orders:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving orders',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

// Initialize Scheduled Tasks
function initializeScheduledTasks() {
    try {
        if (!getConnection().readyState === 1) {
            throw new Error('Database connection is not ready');
        }

        logger.info('Initializing order management cron jobs...');

        // Writer payments - 15th and last day of month
        cron.schedule('0 0 * * *', async () => {
            try {
                if (isPayDay()) {
                    logger.info('Starting scheduled writer payment processing...');
                    await processWriterPayments();
                }
            } catch (error) {
                logger.error('Error processing writer payments:', error);
            }
        });

        // Auto-complete orders - daily midnight
        cron.schedule('0 0 * * *', async () => {
            try {
                await autoCompleteOrders();
            } catch (error) {
                logger.error('Error in auto-complete orders job:', error);
            }
        });

        // Check late orders - every 6 hours
        cron.schedule('0 */6 * * *', async () => {
            try {
                await checkLateOrders();
            } catch (error) {
                logger.error('Error checking late orders:', error);
            }
        });

        // Process editor payments - daily
        cron.schedule('0 0 * * *', async () => {
            try {
                await processEditorPayments();
            } catch (error) {
                logger.error('Error processing editor payments:', error);
            }
        });

        // Update order analytics - every hour
        cron.schedule('0 * * * *', async () => {
            try {
                await updateOrderAnalytics();
            } catch (error) {
                logger.error('Error updating order analytics:', error);
            }
        });

        logger.info('Order management cron jobs initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize order management cron jobs:', error);
        throw error;
    }
}

// Scheduled Task Implementations
async function autoCompleteOrders() {
    const session = await getConnection().startSession();
    try {
        session.startTransaction();

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const ordersToComplete = await Order.find({
            status: 'completed',
            editorReviewStatus: 'approved',
            completedAt: { $lte: sevenDaysAgo },
            isDisputed: { $ne: true }
        }).session(session);

        logger.info(`Found ${ordersToComplete.length} orders for auto-completion`);

        for (const order of ordersToComplete) {
            await processOrderCompletion(order, session);
        }

        await recordMetric('orders_auto_completed', {
            count: ordersToComplete.length,
            date: new Date()
        }, session);

        await session.commitTransaction();
        logger.info(`Successfully auto-completed ${ordersToComplete.length} orders`);
    } catch (error) {
        await session.abortTransaction();
        logger.error('Error in autoCompleteOrders:', error);
    } finally {
        session.endSession();
    }
}

async function processOrderCompletion(order, session) {
    try {
        // Update order status
        order.status = 'completed_approved';
        order.autoApproved = true;
        order.approvedAt = new Date();

        // Process writer payment if not already processed
        if (!order.writerPaid) {
            await processWriterPayment(order, session);
        }

        // Process editor payment if not already processed
        if (!order.editorPaid) {
            await processEditorPayment(order, session);
        }

        await order.save({ session });

        // Send notifications
        await notificationService.sendBulkNotifications([
            {
                user: order.writer,
                title: 'Order Auto-completed',
                message: `Order #${order._id} has been automatically completed and payment processed.`
            },
            {
                user: order.employer,
                title: 'Order Completed',
                message: `Order #${order._id} has been automatically marked as completed.`
            }
        ]);

        // Update analytics
        await updateAnalytics('order_completion', {
            orderId: order._id,
            completionType: 'auto',
            timeToComplete: order.approvedAt - order.createdAt
        }, session);

    } catch (error) {
        logger.error(`Error processing order completion for order ${order._id}:`, error);
        throw error;
    }
}

// Payment Processing Functions
async function processWriterPayment(order, session) {
    try {
        const writer = await User.findById(order.writer).session(session);
        if (!writer) {
            throw new Error(`Writer not found for order ${order._id}`);
        }

        // Calculate payment amount
        const hasSubscription = await Subscription.findOne({
            user: writer._id,
            status: 'active',
            endDate: { $gt: new Date() }
        }).session(session);

        const fee = hasSubscription ? 0 : (order.amount * WRITER_FEE_PERCENTAGE);
        const paymentAmount = order.amount - fee;

        // Create payment record
        const payment = await Payment.create([{
            user: writer._id,
            amount: paymentAmount,
            type: 'writer_payment',
            orderId: order._id,
            status: 'pending',
            description: `Payment for Order #${order._id}`,
            fee: fee
        }], { session });

        // Update writer statistics
        await User.findByIdAndUpdate(writer._id, {
            $inc: {
                'stats.completedOrders': 1,
                'stats.totalEarnings': paymentAmount
            }
        }, { session });

        // Mark order as writer paid
        order.writerPaid = true;
        order.writerPaymentId = payment[0]._id;

        return payment[0];
    } catch (error) {
        logger.error(`Error processing writer payment for order ${order._id}:`, error);
        throw error;
    }
}

async function processEditorPayment(order, session) {
    try {
        const editor = await User.findById(order.editor).session(session);
        if (!editor) {
            throw new Error(`Editor not found for order ${order._id}`);
        }

        const editorPayment = order.pages * EDITOR_PAGE_RATE;

        // Create payment record
        const payment = await Payment.create([{
            user: editor._id,
            amount: editorPayment,
            type: 'editor_payment',
            orderId: order._id,
            status: 'pending',
            description: `Editing fee for Order #${order._id}`
        }], { session });

        // Update editor statistics
        await User.findByIdAndUpdate(editor._id, {
            $inc: {
                'stats.completedReviews': 1,
                'stats.totalEarnings': editorPayment
            }
        }, { session });

        // Mark order as editor paid
        order.editorPaid = true;
        order.editorPaymentId = payment[0]._id;

        return payment[0];
    } catch (error) {
        logger.error(`Error processing editor payment for order ${order._id}:`, error);
        throw error;
    }
}

async function checkLateOrders() {
    const session = await getConnection().startSession();
    try {
        session.startTransaction();

        const now = new Date();
        const lateOrders = await Order.find({
            status: 'in_progress',
            deadline: { $lt: now },
            isDisputed: { $ne: true }
        }).session(session);

        for (const order of lateOrders) {
            const hoursLate = Math.floor((now - order.deadline) / (1000 * 60 * 60));

            // Update order status
            order.isLate = true;
            order.hoursLate = hoursLate;
            await order.save({ session });

            // Record metrics
            await recordMetric('late_order', {
                orderId: order._id,
                hoursLate,
                writerId: order.writer
            }, session);

            // Send notifications
            await notificationService.sendBulkNotifications([
                {
                    user: order.writer,
                    title: 'Late Order Alert',
                    message: `Your order "${order.title}" is ${hoursLate} hours late`
                },
                {
                    user: order.employer,
                    title: 'Order Delay',
                    message: `Order "${order.title}" is delayed by ${hoursLate} hours`
                }
            ]);
        }

        await session.commitTransaction();
        logger.info(`Processed ${lateOrders.length} late orders`);
    } catch (error) {
        await session.abortTransaction();
        logger.error('Error in checkLateOrders:', error);
    } finally {
        session.endSession();
    }
}

async function updateOrderAnalytics() {
    const session = await getConnection().startSession();
    try {
        session.startTransaction();

        const stats = await Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$amount' },
                    averageValue: { $avg: '$amount' }
                }
            }
        ]).session(session);

        const timeMetrics = await Order.aggregate([
            {
                $match: {
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    averageCompletionTime: {
                        $avg: { $subtract: ['$completedAt', '$createdAt'] }
                    },
                    onTimeDelivery: {
                        $avg: {
                            $cond: [
                                { $lte: ['$completedAt', '$deadline'] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]).session(session);

        await Analytics.create([{
            type: 'order_metrics',
            data: {
                statusBreakdown: stats,
                timeMetrics: timeMetrics[0],
                timestamp: new Date()
            }
        }], { session });

        await session.commitTransaction();
        logger.info('Order analytics updated successfully');
    } catch (error) {
        await session.abortTransaction();
        logger.error('Error updating order analytics:', error);
    } finally {
        session.endSession();
    }
}

// API Endpoints for Order Management
exports.createOrder = async (req, res) => {
    const session = await getConnection().startSession();
    try {
        session.startTransaction();

        const { title, description, subject, pages, deadline, price } = req.body;

        // Validate employer subscription
        const employer = await User.findById(req.user.id).session(session);
        const subscription = await Subscription.findOne({
            user: employer._id,
            type: 'employer',
            status: 'active',
            endDate: { $gt: new Date() }
        }).session(session);

        if (!subscription) {
            await session.abortTransaction();
            return res.status(403).json({ msg: 'Active subscription required to post orders' });
        }

        // Create order
        const order = new Order({
            employer: employer._id,
            title,
            description,
            subject,
            pages,
            deadline,
            price,
            isPrivate: req.body.isPrivate || false,
            preferredWriter: req.body.preferredWriter || null,
            files: req.body.files || [],
            requirements: req.body.requirements || []
        });

        await order.save({ session });

        // Record analytics
        await updateAnalytics('order_creation', {
            orderId: order._id,
            employerId: employer._id,
            orderType: req.body.isPrivate ? 'private' : 'public'
        }, session);

        await session.commitTransaction();
        res.status(201).json({ success: true, order });

        // Notify potential writers
        if (!order.isPrivate) {
            notificationService.notifyWriters('New Order',
                `A new order "${title}" has been posted`);
        }
    } catch (error) {
        await session.abortTransaction();
        logger.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        session.endSession();
    }
};

// Error Handling Middleware
exports.handleOrderError = (error, req, res, next) => {
    logger.error('Order error:', error);
    res.status(500).json({
        success: false,
        message: 'An error occurred processing the order',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
};

// Initialize scheduled tasks
try {
    initializeScheduledTasks();
} catch (error) {
    logger.error('Failed to initialize OrderController:', error);
}

module.exports = exports;