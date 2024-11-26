const Payment = require('../models/paymentModels');
const User = require('../models/userModels');
const Order = require('../models/orderModels');
const intaSendService = require('../services/intaSendService');
const walletService = require('../services/walletService');
const notificationService = require('../services/notificationService');
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
        new winston.transports.File({ filename: 'payment-logs.log' }),
        new winston.transports.File({ filename: 'transaction-logs.log', level: 'info' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Constants
const ANSWER_PRICE = 100; // Fixed price of KSH 100 per answer
const WRITER_FEE_PERCENTAGE = 0.07; // 7% fee for non-subscribed writers
const EDITOR_PAGE_RATE = 5; // KSH 5 per page for editors
const MINIMUM_WITHDRAWAL = 500; // KSH 500 minimum withdrawal

// Helper Functions
async function checkWriterSubscription(writerId, session) {
    try {
        return await Subscription.findOne({
            user: writerId,
            status: 'active',
            endDate: { $gt: new Date() }
        }).session(session);
    } catch (error) {
        logger.error('Error checking writer subscription:', error);
        throw error;
    }
}

async function calculateOrderFees(orderAmount, pages, writerId, session) {
    try {
        const hasSubscription = await checkWriterSubscription(writerId, session);
        const editorFee = pages * EDITOR_PAGE_RATE;
        const writerFee = hasSubscription ? 0 : (orderAmount * WRITER_FEE_PERCENTAGE);

        await recordMetric('fee_calculation', {
            orderAmount,
            pages,
            writerFee,
            editorFee,
            hasSubscription: !!hasSubscription
        }, session);

        return {
            writerFee,
            editorFee,
            hasSubscription: !!hasSubscription,
            totalFees: writerFee + editorFee
        };
    } catch (error) {
        logger.error('Error calculating order fees:', error);
        throw error;
    }
}

async function recordMetric(type, data, session) {
    try {
        await SystemMetrics.create([{
            type,
            value: data,
            timestamp: new Date()
        }], { session });
    } catch (error) {
        logger.error('Error recording metric:', error);
    }
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

// Payment Processing Endpoints
exports.processOrderPayment = async (req, res) => {
    const session = await getConnection().startSession();
    try {
        session.startTransaction();

        const { orderId } = req.params;
        const order = await Order.findById(orderId)
            .populate('writer')
            .populate('editor')
            .session(session);

        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({ msg: 'Order not found' });
        }

        // Calculate fees
        const { writerFee, editorFee, hasSubscription } = 
            await calculateOrderFees(order.amount, order.pages, order.writer._id, session);

        // Validate writer balance
        if (writerFee > 0 && order.writer.walletBalance < writerFee) {
            await session.abortTransaction();
            return res.status(400).json({
                msg: 'Insufficient writer balance for order fee',
                required: writerFee,
                current: order.writer.walletBalance
            });
        }

        // Create payment record
        const payment = await Payment.create([{
            order: order._id,
            writer: order.writer._id,
            editor: order.editor._id,
            amount: order.amount,
            writerFee,
            editorFee,
            status: 'pending',
            details: {
                writerHasSubscription: hasSubscription,
                pageCount: order.pages,
                baseAmount: order.amount,
                createdAt: new Date()
            }
        }], { session });

        // Process writer fee if applicable
        if (writerFee > 0) {
            order.writer.walletBalance -= writerFee;
            await order.writer.save({ session });

            // Record fee transaction
            await Payment.create([{
                user: order.writer._id,
                amount: writerFee,
                type: 'writer_fee',
                orderId: order._id,
                status: 'completed',
                description: `Fee deduction for Order #${order._id}`
            }], { session });

            await recordMetric('writer_fee_deduction', {
                writerId: order.writer._id,
                orderId: order._id,
                amount: writerFee,
                timestamp: new Date()
            }, session);
        }

        // Update order status
        order.paymentStatus = 'processing';
        order.feesPaid = true;
        order.feesAmount = writerFee;
        await order.save({ session });

        // Update analytics
        await updateAnalytics('order_payment_processed', {
            orderId: order._id,
            writerId: order.writer._id,
            amount: order.amount,
            fees: { writer: writerFee, editor: editorFee },
            timestamp: new Date()
        }, session);

        await session.commitTransaction();

        // Send notifications
        await notificationService.sendBulkNotifications([
            {
                user: order.writer._id,
                title: 'Fee Processed',
                message: `Fee of KSH ${writerFee} has been processed for Order #${order._id}`
            },
            {
                user: order.editor._id,
                title: 'Payment Processing',
                message: `Payment processing initiated for Order #${order._id}`
            }
        ]);

        res.json({
            success: true,
            payment: {
                id: payment[0]._id,
                writerFee,
                editorFee,
                totalAmount: order.amount,
                hasSubscription
            }
        });

    } catch (error) {
        await session.abortTransaction();
        logger.error('Error processing order payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing payment',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        session.endSession();
    }
};

// Payment Release Functions
async function releasePayment(order, session) {
  try {
      const [writer, editor] = await Promise.all([
          User.findById(order.writer).session(session),
          User.findById(order.editor).session(session)
      ]);

      const editorPayment = order.pages * EDITOR_PAGE_RATE;
      const { writerFee } = await calculateOrderFees(order.amount, order.pages, writer._id, session);
      const writerPayment = order.amount - writerFee;

      // Update balances and create payment records
      await Promise.all([
          // Update writer balance
          User.findByIdAndUpdate(writer._id, {
              $inc: {
                  walletBalance: writerPayment,
                  'stats.totalEarnings': writerPayment,
                  'stats.completedOrders': 1
              }
          }, { session }),

          // Update editor balance
          User.findByIdAndUpdate(editor._id, {
              $inc: {
                  walletBalance: editorPayment,
                  'stats.totalEarnings': editorPayment,
                  'stats.completedReviews': 1
              }
          }, { session }),

          // Record writer payment
          Payment.create([{
              user: writer._id,
              amount: writerPayment,
              type: 'writer_payment',
              orderId: order._id,
              status: 'completed',
              description: `Payment for Order #${order._id}`,
              processingDetails: {
                  originalAmount: order.amount,
                  fee: writerFee,
                  finalAmount: writerPayment
              }
          }], { session }),

          // Record editor payment
          Payment.create([{
              user: editor._id,
              amount: editorPayment,
              type: 'editor_payment',
              orderId: order._id,
              status: 'completed',
              description: `Editing fee for Order #${order._id}`,
              processingDetails: {
                  pagesEdited: order.pages,
                  ratePerPage: EDITOR_PAGE_RATE,
                  totalAmount: editorPayment
              }
          }], { session })
      ]);

      // Update order status
      order.paymentStatus = 'completed';
      order.paymentCompletedAt = new Date();
      await order.save({ session });

      // Record analytics
      await updateAnalytics('payment_release', {
          orderId: order._id,
          writerPayment,
          editorPayment,
          timestamp: new Date()
      }, session);

      // Send notifications
      await notificationService.sendBulkNotifications([
          {
              user: writer._id,
              title: 'Payment Received',
              message: `Payment of KSH ${writerPayment} has been credited for Order #${order._id}`
          },
          {
              user: editor._id,
              title: 'Payment Received',
              message: `Payment of KSH ${editorPayment} has been credited for Order #${order._id}`
          }
      ]);

      return { success: true, writerPayment, editorPayment };
  } catch (error) {
      logger.error('Error releasing payment:', error);
      throw error;
  }
}

// Answer Purchase Endpoints
exports.initiateAnswerPurchase = async (req, res) => {
  const session = await getConnection().startSession();
  try {
      session.startTransaction();

      const { answerId } = req.body;
      const answer = await Answer.findById(answerId)
          .populate('question')
          .populate('author')
          .session(session);

      if (!answer) {
          await session.abortTransaction();
          return res.status(404).json({ msg: 'Answer not found' });
      }

      // Validate answer status and access
      if (!answer.status === 'approved' || answer.accessList.includes(req.user.id)) {
          await session.abortTransaction();
          return res.status(400).json({ 
              msg: answer.accessList.includes(req.user.id) ? 
                  'You already have access to this answer' : 
                  'This answer is not available for purchase' 
          });
      }

      // Create payment record
      const payment = await Payment.create([{
          user: req.user.id,
          amount: ANSWER_PRICE,
          type: 'answer_purchase',
          answerId: answer._id,
          questionId: answer.question._id,
          status: 'pending'
      }], { session });

      // Initiate payment with IntaSend
      const paymentResponse = await intaSendService.initiatePayment({
          amount: ANSWER_PRICE,
          recipient: {
              email: req.user.email,
              phone: req.user.phoneNumber
          },
          reference: `ANS-${payment[0]._id}`,
          description: `Purchase of answer for question: ${answer.question.title}`
      });

      if (!paymentResponse.success) {
          payment[0].status = 'failed';
          payment[0].failureReason = paymentResponse.error;
          await payment[0].save({ session });
          await session.abortTransaction();
          return res.status(400).json({ msg: 'Payment initiation failed' });
      }

      await session.commitTransaction();
      res.json({
          success: true,
          paymentId: payment[0]._id,
          amount: ANSWER_PRICE,
          paymentDetails: paymentResponse.details
      });

  } catch (error) {
      await session.abortTransaction();
      logger.error('Error initiating answer purchase:', error);
      res.status(500).json({ 
          success: false,
          message: 'Error initiating purchase',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
  } finally {
      session.endSession();
  }
};

// Wallet Operations
exports.initiateWithdrawal = async (req, res) => {
  const session = await getConnection().startSession();
  try {
      session.startTransaction();

      const { amount } = req.body;
      if (amount < MINIMUM_WITHDRAWAL) {
          await session.abortTransaction();
          return res.status(400).json({ 
              msg: `Minimum withdrawal amount is KSH ${MINIMUM_WITHDRAWAL}` 
          });
      }

      const user = await User.findById(req.user.id).session(session);
      if (user.walletBalance < amount) {
          await session.abortTransaction();
          return res.status(400).json({ 
              msg: 'Insufficient balance',
              available: user.walletBalance,
              requested: amount
          });
      }

      // Create withdrawal record
      const withdrawal = await Payment.create([{
          user: user._id,
          amount: amount,
          type: 'withdrawal',
          status: 'pending',
          description: 'Withdrawal request',
          withdrawalMethod: req.body.method || 'mpesa'
      }], { session });

      // Update user balance
      user.walletBalance -= amount;
      await user.save({ session });

      // Record analytics
      await updateAnalytics('withdrawal_initiated', {
          userId: user._id,
          amount,
          method: req.body.method || 'mpesa',
          timestamp: new Date()
      }, session);

      await session.commitTransaction();

      // Process withdrawal through IntaSend
      intaSendService.processWithdrawal({
          paymentId: withdrawal[0]._id,
          amount,
          recipient: {
              name: user.name,
              phone: user.phoneNumber
          }
      }).catch(error => {
          logger.error('Error processing withdrawal:', error);
          // Handle failed withdrawal asynchronously
      });

      res.json({
          success: true,
          withdrawal: withdrawal[0]
      });

  } catch (error) {
      await session.abortTransaction();
      logger.error('Error initiating withdrawal:', error);
      res.status(500).json({
          success: false,
          message: 'Error processing withdrawal request',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
  } finally {
      session.endSession();
  }
};

// Initialize auto-approval cron job
cron.schedule('0 0 * * *', async () => {
  try {
      const session = await getConnection().startSession();
      session.startTransaction();

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const pendingOrders = await Order.find({
          status: 'completed',
          paymentStatus: 'processing',
          completedAt: { $lte: sevenDaysAgo },
          isDisputed: { $ne: true }
      }).session(session);

      logger.info(`Processing ${pendingOrders.length} orders for auto-approval`);

      for (const order of pendingOrders) {
          await releasePayment(order, session);
      }

      await session.commitTransaction();
      logger.info('Auto-approval process completed successfully');
  } catch (error) {
      logger.error('Error in auto-approval process:', error);
  } finally {
      session.endSession();
  }
});

// Export controller
module.exports = exports;