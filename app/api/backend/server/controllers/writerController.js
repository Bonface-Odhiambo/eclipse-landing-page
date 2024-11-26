const User = require('../models/userModels');
const Order = require('../models/orderModels');
const Payment = require('../models/paymentModels');
const intasend = require('../config/intasend');
const Notification = require('../utils/notifications');
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const { GridFsStorage } = require('multer-gridfs-storage');
const cron = require('node-cron');
const winston = require('winston');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const { sendEmail, sendSMS } = require('../utils/notifications');
const { validateOrder, validatePayment } = require('../utils/validation');

const storage = new GridFsStorage({
    url: 'mongodb+srv://Eclipse_Writers:xOGX1UkwTznrMsvN@cluster0.k0ncz.mongodb.net/myDatabase?retryWrites=true&w=majority&appName=Cluster0',
    options: { useNewUrlParser: true, useUnifiedTopology: true },
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }

                // Generate unique filename
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads',
                    metadata: {
                        originalname: file.originalname,
                        orderId: req.params.orderId,
                        uploadedBy: req.user._id,
                        uploadedAt: new Date(),
                        fileType: file.mimetype
                    }
                };
                resolve(fileInfo);
            });
        });
    }
});

// Configure multer
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maximum 5 files per upload
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/png'
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            const error = new Error('Invalid file type');
            error.code = 'INVALID_FILE_TYPE';
            return cb(error, false);
        }
        cb(null, true);
    }
}).array('files', 5);

// File Upload Handler
const uploadFile = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        // Verify order exists and belongs to writer
        const order = await Order.findOne({
            _id: req.params.orderId,
            writerId: req.user._id
        }).session(session);

        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Order not found or unauthorized'
            });
        }

        // Handle file upload using multer
        upload(req, res, async (err) => {
            if (err) {
                logger.error('File upload error:', err);
                return res.status(400).json({
                    success: false,
                    message: err.code === 'LIMIT_FILE_SIZE' 
                        ? 'File size cannot exceed 10MB'
                        : err.code === 'LIMIT_FILE_COUNT'
                        ? 'Cannot upload more than 5 files at once'
                        : err.code === 'INVALID_FILE_TYPE'
                        ? 'Invalid file type'
                        : 'File upload failed'
                });
            }

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No files uploaded'
                });
            }

            // Update order with file references
            const fileRefs = req.files.map(file => ({
                fileId: file.id,
                filename: file.filename,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                uploadedAt: new Date()
            }));

            // Add files to order's files array
            order.files = order.files || [];
            order.files.push(...fileRefs);
            await order.save({ session });

            // Log file upload activity
            await Promise.all([
                Activity.create([{
                    orderId: order._id,
                    writerId: req.user._id,
                    type: 'file_upload',
                    details: {
                        fileCount: req.files.length,
                        files: fileRefs.map(f => ({
                            originalname: f.originalname,
                            size: f.size
                        }))
                    }
                }], { session }),

                Notification.create([{
                    userId: order.clientId,
                    title: 'New files uploaded',
                    message: `Writer has uploaded ${req.files.length} file(s) for order #${order.orderNumber}`,
                    type: 'order_update',
                    orderId: order._id
                }], { session })
            ]);

            await session.commitTransaction();

            res.json({
                success: true,
                data: {
                    message: 'Files uploaded successfully',
                    files: fileRefs,
                    totalFiles: order.files.length
                }
            });
        });

    } catch (error) {
        await session.abortTransaction();
        logger.error('Error in file upload:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process file upload',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        session.endSession();
    }
};

async function handlePaymentCallback(req, res) {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const { invoice_id, state, tracking_id, value, payment_method } = req.body;

        // Verify the callback by checking IntaSend signature
        const isValidCallback = await intasend.verifyCallback(req.body, req.headers['x-intasend-signature']);
        if (!isValidCallback) {
            await session.abortTransaction();
            return res.status(401).json({
                success: false,
                message: 'Invalid callback signature'
            });
        }

        // Find the corresponding payment record
        const payment = await Payment.findOne({
            intaSendInvoiceId: invoice_id,
            status: 'pending'
        }).populate('writerId').session(session);

        if (!payment) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Payment record not found'
            });
        }

        // Update payment record
        payment.status = state === 'COMPLETE' ? 'completed' : 'failed';
        payment.processedAt = new Date();
        payment.transactionDetails = {
            state,
            tracking_id,
            value,
            payment_method
        };

        await payment.save({ session });

        // If payment is successful, update writer subscription or balance
        if (state === 'COMPLETE') {
            const writer = payment.writerId;

            if (payment.type === 'subscription') {
                // Update subscription
                const subscriptionEnd = writer.subscription?.endDate > new Date() 
                    ? new Date(writer.subscription.endDate.setMonth(writer.subscription.endDate.getMonth() + 1))
                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                writer.subscription = {
                    status: 'active',
                    startDate: new Date(),
                    endDate: subscriptionEnd,
                    lastPayment: {
                        amount: value,
                        date: new Date(),
                        paymentId: payment._id
                    }
                };

                await writer.save({ session });

                // Create subscription activity record
                await Analytics.create([{
                    type: 'subscription_renewed',
                    data: {
                        writerId: writer._id,
                        paymentId: payment._id,
                        subscriptionDetails: writer.subscription
                    }
                }], { session });

            } else if (payment.type === 'order_payment' || payment.type === 'bonus') {
                // Update writer's wallet
                await User.findByIdAndUpdate(writer._id, {
                    $inc: {
                        'wallet.balance': value,
                        'wallet.totalEarnings': value
                    },
                    $push: {
                        'wallet.transactions': {
                            type: payment.type,
                            amount: value,
                            date: new Date(),
                            paymentId: payment._id,
                            description: `Payment for ${payment.type === 'bonus' ? 'bonus' : 'order'}`
                        }
                    }
                }, { session });
            }

            // Send success notifications
            await Promise.all([
                Notification.create([{
                    userId: writer._id,
                    title: 'Payment Successful',
                    message: `Your payment of KES ${value} has been processed successfully`,
                    type: 'payment_success',
                    data: {
                        paymentId: payment._id,
                        amount: value
                    }
                }], { session }),

                sendEmail({
                    to: writer.email,
                    subject: 'Payment Processed Successfully',
                    template: 'payment-success',
                    data: {
                        userName: writer.name,
                        amount: value,
                        paymentType: payment.type,
                        date: new Date().toLocaleDateString()
                    }
                }),

                sendSMS({
                    to: writer.phone,
                    message: `Eclipse Writers: Your payment of KES ${value} has been processed successfully. TID: ${tracking_id}`
                })
            ]);

        } else {
            // Handle failed payment
            await Promise.all([
                Notification.create([{
                    userId: payment.writerId._id,
                    title: 'Payment Failed',
                    message: `Your payment of KES ${value} has failed. Please try again.`,
                    type: 'payment_failed'
                }], { session }),

                sendEmail({
                    to: payment.writerId.email,
                    subject: 'Payment Failed',
                    template: 'payment-failed',
                    data: {
                        userName: payment.writerId.name,
                        amount: value,
                        paymentType: payment.type,
                        date: new Date().toLocaleDateString()
                    }
                })
            ]);
        }

        // Log payment activity
        await Analytics.create([{
            type: 'payment_callback_processed',
            data: {
                paymentId: payment._id,
                writerId: payment.writerId._id,
                status: state,
                amount: value,
                type: payment.type
            }
        }], { session });

        await session.commitTransaction();

        // Return success response
        res.json({
            success: true,
            message: 'Payment callback processed successfully'
        });

    } catch (error) {
        await session.abortTransaction();
        logger.error('Payment callback processing failed:', error);
        
        // Log error for monitoring
        await Notification.create({
            userId: 'admin',
            title: 'Payment Callback Error',
            message: `Failed to process payment callback: ${error.message}`,
            type: 'system_error',
            priority: 'high'
        });

        res.status(500).json({
            success: false,
            message: 'Failed to process payment callback',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        session.endSession();
    }
}

// File Download Handler
const getFile = async (req, res) => {
    try {
        const fileId = req.params.fileId;
        
        // Verify user has access to this file
        const order = await Order.findOne({
            'files.fileId': mongoose.Types.ObjectId(fileId),
            $or: [
                { writerId: req.user._id },
                { clientId: req.user._id }
            ]
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'File not found or unauthorized'
            });
        }

        const file = await gfs.files.findOne({ _id: mongoose.Types.ObjectId(fileId) });
        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Set appropriate headers
        res.set('Content-Type', file.contentType);
        res.set('Content-Disposition', `attachment; filename="${file.metadata.originalname}"`);

        // Stream file to response
        const readStream = gfs.createReadStream({ _id: file._id });
        readStream.pipe(res);

    } catch (error) {
        logger.error('Error downloading file:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download file',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// File Deletion Handler
const deleteFile = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const { orderId, fileId } = req.params;

        // Verify order and file ownership
        const order = await Order.findOne({
            _id: orderId,
            writerId: req.user._id,
            'files.fileId': mongoose.Types.ObjectId(fileId)
        }).session(session);

        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Order or file not found'
            });
        }

        // Remove file from GridFS
        await gfs.delete(mongoose.Types.ObjectId(fileId));

        // Update order document
        order.files = order.files.filter(file => 
            file.fileId.toString() !== fileId
        );
        await order.save({ session });

        // Log deletion activity
        await Activity.create([{
            orderId: order._id,
            writerId: req.user._id,
            type: 'file_delete',
            details: {
                fileId: fileId
            }
        }], { session });

        await session.commitTransaction();

        res.json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        await session.abortTransaction();
        logger.error('Error deleting file:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete file',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        session.endSession();
    }
};
// Configure Winston logger
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'writer-activity.log' }),
        new winston.transports.File({ filename: 'payment-logs.log', level: 'info' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Initialize GridFS
let gfs;
mongoose.connection.once('open', () => {
    gfs = Grid(mongoose.connection.db, mongoose.mongo);
    gfs.collection('uploads');
});

// Constants
const SUBSCRIPTION_FEE = 560; // Monthly subscription fee
const MINIMUM_WITHDRAWAL = 1000; // Minimum withdrawal amount
const WRITER_FEE_PERCENTAGE = 0.07; // 7% for non-subscribed writers

// Initialize Scheduled Tasks
const initializeCronJobs = () => {
    try {
        logger.info('Initializing writer management cron jobs...');

        // Check subscriptions daily at midnight
        cron.schedule('0 0 * * *', async () => {
            try {
                await checkSubscriptions();
            } catch (error) {
                logger.error('Subscription check failed:', error);
            }
        });

        // Check order deadlines hourly
        cron.schedule('0 * * * *', async () => {
            try {
                await checkOrderDeadlines();
            } catch (error) {
                logger.error('Deadline check failed:', error);
            }
        });

        // Process bi-monthly payments (15th and last day)
        cron.schedule('0 1 15,L * *', async () => {
            try {
                await processWriterPayments();
            } catch (error) {
                logger.error('Payment processing failed:', error);
            }
        });

        // Update writer analytics every 6 hours
        cron.schedule('0 */6 * * *', async () => {
            try {
                await updateWriterAnalytics();
            } catch (error) {
                logger.error('Analytics update failed:', error);
            }
        });

        logger.info('Writer management cron jobs initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize cron jobs:', error);
        throw error;
    }
};

// Cron Job Implementations
async function checkSubscriptions() {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const expiredSubscriptions = await User.find({
            'subscription.endDate': { $lte: new Date() },
            'subscription.status': 'active'
        }).session(session);

        logger.info(`Processing ${expiredSubscriptions.length} expired subscriptions`);

        for (const user of expiredSubscriptions) {
            user.subscription.status = 'expired';
            await user.save({ session });

            await Promise.all([
                Notification.create([{
                    userId: user._id,
                    title: 'Subscription Expired',
                    message: 'Your subscription has expired. Renew now to avoid commission charges.',
                    type: 'subscription'
                }], { session }),

                sendEmail({
                    to: user.email,
                    subject: 'Subscription Expired',
                    template: 'subscription-expired',
                    data: { userName: user.name }
                }),

                Analytics.create([{
                    type: 'subscription_expired',
                    data: {
                        userId: user._id,
                        subscriptionDetails: user.subscription
                    }
                }], { session })
            ]);
        }

        await session.commitTransaction();
        logger.info('Subscription check completed successfully');
    } catch (error) {
        await session.abortTransaction();
        logger.error('Error in subscription check:', error);
    } finally {
        session.endSession();
    }
}

async function checkOrderDeadlines() {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const approachingDeadlines = await Order.find({
            status: 'in_progress',
            deadline: {
                $lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
                $gt: new Date()
            }
        }).populate('writerId').session(session);

        logger.info(`Processing ${approachingDeadlines.length} approaching deadlines`);

        for (const order of approachingDeadlines) {
            const timeRemaining = order.deadline - new Date();
            const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));

            await Promise.all([
                Notification.create([{
                    userId: order.writerId._id,
                    title: 'Deadline Approaching',
                    message: `Order #${order.orderId} is due in ${hoursRemaining} hours`,
                    type: 'deadline',
                    priority: 'high'
                }], { session }),

                sendSMS({
                    to: order.writerId.phone,
                    message: `URGENT: Order #${order.orderId} is due in ${hoursRemaining} hours`
                }),

                SystemMetrics.create([{
                    type: 'deadline_alert',
                    value: {
                        orderId: order._id,
                        writerId: order.writerId._id,
                        hoursRemaining,
                        originalDeadline: order.deadline
                    }
                }], { session })
            ]);
        }

        await session.commitTransaction();
        logger.info('Deadline check completed successfully');
    } catch (error) {
        await session.abortTransaction();
        logger.error('Error in deadline check:', error);
    } finally {
        session.endSession();
    }
}

// Payment Processing Implementation
async function processWriterPayments() {
  const session = await mongoose.startSession();
  try {
      session.startTransaction();

      logger.info('Starting bi-monthly writer payment processing...');

      const pendingPayments = await Payment.find({
          status: 'pending',
          amount: { $gte: MINIMUM_WITHDRAWAL }
      }).populate('writerId').session(session);

      logger.info(`Processing ${pendingPayments.length} pending payments`);

      for (const payment of pendingPayments) {
          try {
              logger.info(`Processing payment ID: ${payment._id}`);

              const result = await intasend.sendMoney({
                  currency: "KES",
                  value: payment.amount,
                  account: {
                      name: payment.writerId.name,
                      phone_number: payment.writerId.phone,
                      reference: payment._id.toString(),
                      notification_email: payment.writerId.email
                  },
                  payment_method: "M-PESA-STK",
                  api_ref: payment._id.toString()
              });

              // Update payment record
              payment.status = result.success ? 'completed' : 'failed';
              payment.transactionId = result.transactionId;
              payment.processedAt = new Date();
              payment.processAttempts = (payment.processAttempts || 0) + 1;
              payment.lastAttemptResult = result.success ? 'success' : 'failed';
              payment.lastAttemptMessage = result.message;
              await payment.save({ session });

              if (result.success) {
                  await User.findByIdAndUpdate(payment.writerId._id, {
                      $inc: { 'wallet.pendingWithdrawal': -payment.amount }
                  }, { session });
              }

              // Create notifications and send updates
              await Promise.all([
                  Notification.create([{
                      userId: payment.writerId._id,
                      title: result.success ? 'Payment Processed' : 'Payment Failed',
                      message: result.success 
                          ? `KSH ${payment.amount} has been sent to your M-PESA`
                          : `Payment of KSH ${payment.amount} failed. Please contact support.`,
                      type: 'payment'
                  }], { session }),

                  sendEmail({
                      to: payment.writerId.email,
                      subject: result.success ? 'Payment Successful' : 'Payment Failed',
                      template: result.success ? 'payment-success' : 'payment-failed',
                      data: {
                          userName: payment.writerId.name,
                          amount: payment.amount,
                          transactionId: result.transactionId,
                          date: new Date().toLocaleDateString()
                      }
                  }),

                  sendSMS({
                      to: payment.writerId.phone,
                      message: result.success 
                          ? `Eclipse Writers: KSH ${payment.amount} sent to your M-PESA. TID: ${result.transactionId}`
                          : `Eclipse Writers: Payment of KSH ${payment.amount} failed. Contact support.`
                  })
              ]);

              // Record analytics
              await Analytics.create([{
                  type: 'payment_processed',
                  data: {
                      paymentId: payment._id,
                      writerId: payment.writerId._id,
                      amount: payment.amount,
                      success: result.success,
                      transactionId: result.transactionId
                  }
              }], { session });

          } catch (error) {
              logger.error(`Payment processing failed for payment ID ${payment._id}:`, error);
              
              payment.lastAttemptResult = 'error';
              payment.lastAttemptMessage = error.message;
              payment.processAttempts = (payment.processAttempts || 0) + 1;
              await payment.save({ session });

              await Notification.create([{
                  userId: 'admin',
                  title: 'Payment Processing Error',
                  message: `Failed to process payment ID: ${payment._id}. Error: ${error.message}`,
                  type: 'system_error'
              }], { session });
          }
      }

      // Generate and save payment report
      const report = {
          date: new Date(),
          totalProcessed: pendingPayments.length,
          successful: pendingPayments.filter(p => p.status === 'completed').length,
          failed: pendingPayments.filter(p => p.status === 'failed').length,
          totalAmount: pendingPayments.reduce((sum, p) => sum + p.amount, 0)
      };

      await Analytics.create([{
          type: 'payment_processing_report',
          data: report
      }], { session });

      await session.commitTransaction();
      logger.info('Payment processing completed:', report);
  } catch (error) {
      await session.abortTransaction();
      logger.error('Error in payment processing:', error);
      
      await Notification.create({
          userId: 'admin',
          title: 'Payment Processing System Error',
          message: `Bi-monthly payment processing failed: ${error.message}`,
          type: 'system_error'
      });
  } finally {
      session.endSession();
  }
}

// Subscription Processing
async function processSubscription(req, res) {
  const session = await mongoose.startSession();
  try {
      session.startTransaction();

      const { phone } = req.body;
      const writerId = req.user._id;

      const writer = await User.findById(writerId).session(session);
      if (!writer) {
          await session.abortTransaction();
          return res.status(404).json({ 
              success: false, 
              message: 'Writer not found' 
          });
      }

      // Create payment record
      const payment = await Payment.create([{
          writerId,
          amount: SUBSCRIPTION_FEE,
          type: 'subscription',
          status: 'pending',
          mpesaPhone: phone
      }], { session });

      // Initiate payment
      const mpesaResponse = await intasend.collectPayment({
          currency: "KES",
          amount: SUBSCRIPTION_FEE,
          payment_method: "M-PESA-STK",
          phone_number: phone,
          api_ref: payment[0]._id.toString(),
          narrative: "Eclipse Writers Monthly Subscription"
      });

      if (mpesaResponse.invoice.state === 'PENDING') {
          payment[0].intaSendInvoiceId = mpesaResponse.invoice.invoice_id;
          payment[0].intaSendTrackingId = mpesaResponse.tracking_id;
          await payment[0].save({ session });

          await Analytics.create([{
              type: 'subscription_initiated',
              data: {
                  writerId,
                  paymentId: payment[0]._id,
                  amount: SUBSCRIPTION_FEE
              }
          }], { session });

          await session.commitTransaction();
          res.json({
              success: true,
              data: {
                  payment: payment[0],
                  message: 'Please complete the payment on your phone'
              }
          });
      } else {
          await session.abortTransaction();
          res.status(400).json({
              success: false,
              message: 'Failed to initiate subscription payment'
          });
      }
  } catch (error) {
      await session.abortTransaction();
      logger.error('Subscription processing failed:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to process subscription',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
  } finally {
      session.endSession();
  }
}

// Update Analytics
async function updateWriterAnalytics() {
  const session = await mongoose.startSession();
  try {
      session.startTransaction();

      const writers = await User.find({ role: 'writer' }).session(session);

      for (const writer of writers) {
          const [orderStats, earningsStats] = await Promise.all([
              Order.aggregate([
                  { $match: { writerId: writer._id } },
                  { $group: {
                      _id: null,
                      totalOrders: { $sum: 1 },
                      completedOrders: {
                          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                      },
                      totalEarnings: { $sum: '$amount' },
                      onTimeDelivery: {
                          $avg: { $cond: [
                              { $lte: ['$completedAt', '$deadline'] },
                              1,
                              0
                          ]}
                      }
                  }}
              ]).session(session),
              Payment.aggregate([
                  { $match: { 
                      writerId: writer._id,
                      status: 'completed',
                      type: { $in: ['order_payment', 'bonus'] }
                  }},
                  { $group: {
                      _id: null,
                      totalPayments: { $sum: 1 },
                      totalAmount: { $sum: '$amount' }
                  }}
              ]).session(session)
          ]);

          await Analytics.create([{
              type: 'writer_performance',
              data: {
                  writerId: writer._id,
                  orderStats: orderStats[0] || {},
                  earningsStats: earningsStats[0] || {},
                  timestamp: new Date()
              }
          }], { session });
      }

      await session.commitTransaction();
      logger.info('Writer analytics updated successfully');
  } catch (error) {
      await session.abortTransaction();
      logger.error('Error updating writer analytics:', error);
  } finally {
      session.endSession();
  }
}

// Dashboard Endpoints
const getDashboardStats = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const writerId = req.user._id;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [writer, orderStats, recentActivity] = await Promise.all([
            User.findById(writerId)
                .select('wallet subscription stats')
                .session(session),
            Order.aggregate([
                { 
                    $match: { 
                        writerId: mongoose.Types.ObjectId(writerId),
                        createdAt: { $gte: thirtyDaysAgo }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalEarnings: { $sum: '$amount' },
                        completedOrders: { 
                            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                        },
                        totalOrders: { $sum: 1 },
                        onTimeDelivery: {
                            $avg: { $cond: [
                                { $lte: ['$completedAt', '$deadline'] },
                                1,
                                0
                            ]}
                        }
                    }
                }
            ]).session(session),
            Order.find({ writerId })
                .sort({ updatedAt: -1 })
                .limit(5)
                .select('title status updatedAt amount')
                .session(session)
        ]);

        await session.commitTransaction();

        res.json({
            success: true,
            data: {
                wallet: writer.wallet,
                subscription: writer.subscription,
                stats: {
                    ...writer.stats,
                    ...orderStats[0],
                    recentActivity
                }
            }
        });

    } catch (error) {
        await session.abortTransaction();
        logger.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        session.endSession();
    }
};

const getAvailableOrders = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const writerId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get writer's expertise and level
        const writer = await User.findById(writerId)
            .select('expertise level subscription blockedClients')
            .session(session);

        if (!writer) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Writer not found'
            });
        }

        // Build query conditions
        const queryConditions = {
            status: 'available',
            writerId: { $exists: false },
            clientId: { $nin: writer.blockedClients || [] },
            // Match writer's expertise if specified
            ...(writer.expertise && {
                subject: { $in: writer.expertise }
            }),
            // Match writer's level
            writerLevel: { 
                $lte: writer.level 
            }
        };

        // Get orders and total count
        const [orders, totalOrders] = await Promise.all([
            Order.find(queryConditions)
                .sort({ deadline: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('title description amount deadline subject pages status priority orderType')
                .populate('clientId', 'rating')
                .session(session),
            Order.countDocuments(queryConditions).session(session)
        ]);

        // Calculate order metrics
        const orderMetrics = orders.map(order => ({
            ...order.toObject(),
            metrics: {
                timeToDeadline: order.deadline - new Date(),
                pricePerPage: order.amount / order.pages,
                complexity: calculateComplexity(order),
                urgency: calculateUrgency(order.deadline)
            }
        }));

        await session.commitTransaction();

        // Send response
        res.json({
            success: true,
            data: {
                orders: orderMetrics,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalOrders / limit),
                    totalOrders,
                    hasMore: skip + orders.length < totalOrders
                }
            }
        });

    } catch (error) {
        await session.abortTransaction();
        logger.error('Error fetching available orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available orders',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        session.endSession();
    }
};

// Helper functions for order metrics
function calculateComplexity(order) {
    let complexity = 1;
    
    // Adjust based on order type
    switch (order.orderType) {
        case 'dissertation':
        case 'thesis':
            complexity *= 1.5;
            break;
        case 'research_paper':
            complexity *= 1.3;
            break;
        case 'essay':
            complexity *= 1;
            break;
    }

    // Adjust based on page count
    if (order.pages > 10) complexity *= 1.2;
    if (order.pages > 20) complexity *= 1.3;

    // Adjust based on priority
    if (order.priority === 'high') complexity *= 1.2;

    return Number(complexity.toFixed(2));
}

function calculateUrgency(deadline) {
    const hoursToDeadline = (deadline - new Date()) / (1000 * 60 * 60);
    
    if (hoursToDeadline <= 6) return 'critical';
    if (hoursToDeadline <= 12) return 'high';
    if (hoursToDeadline <= 24) return 'medium';
    return 'low';
}
const getMyOrders = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const writerId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status; // Optional status filter
        const timeframe = req.query.timeframe || 'all'; // all, today, week, month

        // Build date filter based on timeframe
        let dateFilter = {};
        const now = new Date();
        switch (timeframe) {
            case 'today':
                dateFilter = {
                    createdAt: {
                        $gte: new Date(now.setHours(0, 0, 0, 0))
                    }
                };
                break;
            case 'week':
                dateFilter = {
                    createdAt: {
                        $gte: new Date(now.setDate(now.getDate() - 7))
                    }
                };
                break;
            case 'month':
                dateFilter = {
                    createdAt: {
                        $gte: new Date(now.setMonth(now.getMonth() - 1))
                    }
                };
                break;
        }

        // Build query conditions
        const queryConditions = {
            writerId: mongoose.Types.ObjectId(writerId),
            ...dateFilter,
            ...(status && { status }) // Add status filter if provided
        };

        // Get orders and total count with analytics
        const [orders, totalOrders, analytics] = await Promise.all([
            Order.find(queryConditions)
                .sort({ deadline: 1, updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('clientId', 'name rating')
                .select('-files -revisions')
                .session(session),
            
            Order.countDocuments(queryConditions)
                .session(session),
            
            Order.aggregate([
                {
                    $match: {
                        writerId: mongoose.Types.ObjectId(writerId),
                        ...dateFilter
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalEarnings: { $sum: '$amount' },
                        completedOrders: {
                            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                        },
                        inProgressOrders: {
                            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
                        },
                        onTimeDelivery: {
                            $avg: {
                                $cond: [
                                    { $eq: ['$status', 'completed'] },
                                    { $cond: [{ $lte: ['$completedAt', '$deadline'] }, 1, 0] },
                                    null
                                ]
                            }
                        },
                        averageRating: { $avg: '$rating' }
                    }
                }
            ]).session(session)
        ]);

        // Process orders with additional metrics
        const processedOrders = orders.map(order => ({
            ...order.toObject(),
            timeRemaining: order.deadline ? order.deadline - new Date() : null,
            isOverdue: order.deadline ? new Date() > order.deadline : false,
            progress: calculateOrderProgress(order),
            metrics: {
                timeToDeadline: order.deadline ? order.deadline - new Date() : null,
                isUrgent: order.deadline ? (order.deadline - new Date()) < (24 * 60 * 60 * 1000) : false,
                pricePerPage: order.amount / (order.pages || 1)
            }
        }));

        await session.commitTransaction();

        // Send response
        res.json({
            success: true,
            data: {
                orders: processedOrders,
                analytics: analytics[0] || {
                    totalEarnings: 0,
                    completedOrders: 0,
                    inProgressOrders: 0,
                    onTimeDelivery: 0,
                    averageRating: 0
                },
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalOrders / limit),
                    totalOrders,
                    hasMore: skip + orders.length < totalOrders
                }
            }
        });

    } catch (error) {
        await session.abortTransaction();
        logger.error('Error fetching writer orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        session.endSession();
    }
};

// Helper function to calculate order progress
function calculateOrderProgress(order) {
    switch (order.status) {
        case 'assigned':
            return 10;
        case 'in_progress':
            // Calculate progress based on time elapsed since assignment
            const totalTime = order.deadline - order.assignedAt;
            const timeElapsed = new Date() - order.assignedAt;
            const progress = (timeElapsed / totalTime) * 100;
            return Math.min(Math.max(progress, 10), 90); // Keep between 10-90%
        case 'under_review':
            return 90;
        case 'completed':
            return 100;
        case 'cancelled':
            return 0;
        default:
            return 0;
    }
}

// Export all functions
module.exports = {
  initializeCronJobs,
  processWriterPayments,
  processSubscription,
  getDashboardStats,
  getAvailableOrders,
  getMyOrders,
  uploadFile,
  getFile,
  deleteFile,
  handlePaymentCallback,
  updateWriterAnalytics
};