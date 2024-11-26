// employerController.js
const UserModel = require('../models/userModels');
const Order = require('../models/orderModels');
const intasend = require('../config/intasend');
const Payment = require('../models/paymentModels');
const Writer = require('../models/writerModels');
const Notification = require('../models/notificationModels');  // Added this if not present
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const { GridFsStorage } = require('multer-gridfs-storage');
const cron = require('node-cron');
const { sendEmail, sendSMS } = require('../utils/notifications');
const { validateOrder, validatePayment } = require('../utils/validation');

// Initialize GridFS
let gfs;
mongoose.connection.once('open', () => {
  gfs = Grid(mongoose.connection.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Initialize cron jobs for employer system
const initializeCronJobs = () => {
  // Check subscription status daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const expiredSubscriptions = await UserModel.find({
        role: 'employer',
        'subscription.endDate': { $lte: new Date() },
        'subscription.status': 'active'
      });

      for (const employer of expiredSubscriptions) {
        employer.subscription.status = 'expired';
        await employer.save();

        await Notification.create({
          userId: employer._id,
          title: 'Subscription Expired',
          message: 'Your subscription has expired. Renew now to avoid platform fees.',
          type: 'subscription'
        });

        await sendEmail({
          to: employer.email,
          subject: 'Subscription Expired',
          template: 'subscription-expired',
          data: {
            userName: employer.name,
            subscriptionType: employer.subscription.type,
            renewalLink: `${process.env.FRONTEND_URL}/employer/subscription`
          }
        });
      }
    } catch (error) {
      console.error('Subscription check cron job failed:', error);
    }
  });

  // Monitor order deadlines every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const upcomingDeadlines = await Order.find({
        status: 'in_progress',
        deadline: {
          $gt: new Date(),
          $lte: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      }).populate('employerId writerId');

      for (const order of upcomingDeadlines) {
        const hoursLeft = Math.ceil((order.deadline - new Date()) / (1000 * 60 * 60));
        
        await Promise.all([
          Notification.create({
            userId: order.employerId._id,
            title: 'Order Deadline Approaching',
            message: `Your order #${order.orderId} is due in ${hoursLeft} hours`,
            type: 'deadline'
          }),
          Notification.create({
            userId: order.writerId._id,
            title: 'Order Deadline Approaching',
            message: `Order #${order.orderId} is due in ${hoursLeft} hours`,
            type: 'deadline'
          })
        ]);

        if (hoursLeft <= 6) {
          await Promise.all([
            sendSMS({
              to: order.employerId.phone,
              message: `ALERT: Order #${order.orderId} is due in ${hoursLeft} hours. Please check the order status.`
            }),
            sendSMS({
              to: order.writerId.phone,
              message: `URGENT: Order #${order.orderId} is due in ${hoursLeft} hours. Please ensure timely completion.`
            })
          ]);
        }
      }

      // Check for overdue orders
      const overdueOrders = await Order.find({
        status: 'in_progress',
        deadline: { $lt: new Date() }
      });

      for (const order of overdueOrders) {
        order.status = 'disputed';
        order.dispute = {
          reason: 'Deadline missed',
          raisedBy: 'system',
          raisedAt: new Date()
        };
        await order.save();

        // Create notifications for overdue orders
        await Promise.all([
          Notification.create({
            userId: order.employerId,
            title: 'Order Overdue',
            message: `Order #${order.orderId} has missed its deadline and been marked as disputed`,
            type: 'dispute'
          }),
          Notification.create({
            userId: order.writerId,
            title: 'Order Overdue',
            message: `Order #${order.orderId} has missed its deadline and been marked as disputed`,
            type: 'dispute'
          }),
          Notification.create({
            userId: 'admin',
            title: 'Order Dispute - Deadline Missed',
            message: `Order #${order.orderId} has been automatically marked as disputed due to missed deadline`,
            type: 'dispute'
          })
        ]);
      }
    } catch (error) {
      console.error('Order deadline check cron job failed:', error);
    }
  });

  // Auto-approve orders after 7 days if no dispute
  cron.schedule('0 0 * * *', async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const pendingOrders = await Order.find({
        status: 'completed',
        'completedAt': { $lte: sevenDaysAgo },
        'dispute': { $exists: false }
      }).populate('writerId employerId');

      for (const order of pendingOrders) {
        // Update order status
        order.status = 'approved';
        order.approvedAt = new Date();
        order.autoApproved = true;
        await order.save();

        // Process payment to writer
        const writerPayment = order.budget - order.platformFee;
        await Payment.create({
          writerId: order.writerId._id,
          orderId: order._id,
          amount: writerPayment,
          type: 'order_completion',
          status: 'completed',
          autoProcessed: true
        });

        // Update writer's wallet
        await UserModel.findByIdAndUpdate(
          order.writerId._id,
          { $inc: { 'wallet.balance': writerPayment } }
        );

        // Create notifications and send emails
        await Promise.all([
          Notification.create({
            userId: order.writerId._id,
            title: 'Order Auto-Approved',
            message: `Order #${order.orderId} has been automatically approved and payment has been released`,
            type: 'payment'
          }),
          Notification.create({
            userId: order.employerId._id,
            title: 'Order Auto-Approved',
            message: `Order #${order.orderId} has been automatically approved after 7 days of completion`,
            type: 'order_update'
          }),
          sendEmail({
            to: order.writerId.email,
            subject: 'Order Auto-Approved - Payment Released',
            template: 'order-auto-approval',
            data: {
              userName: order.writerId.name,
              orderId: order.orderId,
              amount: writerPayment,
              completionDate: order.completedAt
            }
          }),
          sendEmail({
            to: order.employerId.email,
            subject: 'Order Auto-Approved',
            template: 'order-auto-approval-employer',
            data: {
              userName: order.employerId.name,
              orderId: order.orderId,
              completionDate: order.completedAt
            }
          })
        ]);
      }
    } catch (error) {
      console.error('Auto-approval cron job failed:', error);
    }
  });
};

// Dashboard Statistics
const getDashboardStats = async (req, res) => {
  try {
    const employerId = req.user._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      activeOrders,
      completedOrders,
      disputedOrders,
      orderStats,
      recentTransactions
    ] = await Promise.all([
      Order.countDocuments({ 
        employerId, 
        status: 'in_progress' 
      }),
      Order.countDocuments({ 
        employerId, 
        status: 'completed' 
      }),
      Order.countDocuments({ 
        employerId, 
        status: 'disputed' 
      }),
      Order.aggregate([
        {
          $match: {
            employerId: mongoose.Types.ObjectId(employerId),
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$budget' },
            averageRating: { $avg: '$review.rating' },
            totalOrders: { $sum: 1 }
          }
        }
      ]),
      Payment.find({ employerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('orderId', 'title orderId')
    ]);

    const employer = await UserModel.findById(employerId)
      .select('wallet subscription privateWriters');

    const privateWriters = await Writer.find({
      _id: { $in: employer.privateWriters }
    }).select('name rating completedOrders');

    res.json({
      success: true,
      data: {
        wallet: {
          balance: employer.wallet.balance,
          pendingDisputes: employer.wallet.pendingDisputes || 0,
          subscription: employer.subscription
        },
        orders: {
          active: activeOrders,
          completed: completedOrders,
          disputed: disputedOrders,
          stats: orderStats[0] || {
            totalSpent: 0,
            averageRating: 0,
            totalOrders: 0
          }
        },
        privateWriters,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Get dashboard stats failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

// Order Management
const createOrder = async (req, res) => {
  try {
    const employerId = req.user._id;
    const {
      title,
      description,
      budget,
      deadline,
      subject,
      pages,
      wordCount,
      paperFormat,
      references,
      technicalRequirements,
      isPrivate,
      selectedWriters
    } = req.body;

    const validationResult = validateOrder({
      title,
      description,
      budget,
      deadline,
      subject
    });

    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: validationResult.errors.join(', ')
      });
    }

    const employer = await UserModel.findById(employerId);
    const platformFee = employer.subscription.status === 'active' ? 0 : (budget * 0.09);
    const totalAmount = budget + platformFee;

    if (employer.wallet.balance < totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    let fileDetails = [];
    if (req.files && req.files.length > 0) {
      fileDetails = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: new Date()
      }));
    }

    const order = await Order.create({
      employerId,
      title,
      description,
      budget,
      platformFee,
      deadline: new Date(deadline),
      subject,
      pages,
      wordCount,
      paperFormat,
      references,
      technicalRequirements: technicalRequirements ? JSON.parse(technicalRequirements) : [],
      isPrivate,
      files: fileDetails,
      status: 'posted',
      selectedWriters: isPrivate ? JSON.parse(selectedWriters) : []
    });

    employer.wallet.balance -= totalAmount;
    await employer.save();

    await Payment.create({
      employerId,
      orderId: order._id,
      amount: totalAmount,
      type: 'order_payment',
      status: 'completed'
    });

    if (isPrivate && selectedWriters) {
      const writers = JSON.parse(selectedWriters);
      await Promise.all(writers.map(writerId => 
        Notification.create({
          userId: writerId,
          title: 'New Private Order',
          message: `You've been selected for a new private order: ${title}`,
          type: 'order'
        })
      ));
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Create order failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
};

// File Management methods remain the same
const handleFileUpload = async (req, res) => {
  try {
    const { orderId } = req.params;
    const files = req.files;
    const employerId = req.user._id;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      employerId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const fileDetails = files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: new Date()
    }));

    order.files = [...(order.files || []), ...fileDetails];
    await order.save();

    if (order.writerId) {
      await Notification.create({
        userId: order.writerId,
        title: 'New Files Added',
        message: `Employer has added new files to order #${order.orderId}`,
        type: 'order_update'
      });
    }

    res.json({
      success: true,
      data: {
        files: fileDetails,
        message: 'Files uploaded successfully'
      }
    });
  } catch (error) {
    console.error('File upload failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload files'
    });
  }
};


//MPESA Callback
// Add this function to your employerController.js
const handleMpesaCallback = async (req, res) => {
  try {
    const { event, invoice } = req.body;

    // Verify callback authenticity using signature
    const signature = req.headers['x-intasend-signature'];
    // Add signature verification if needed

    // Find the payment record
    const payment = await Payment.findById(invoice.api_ref);
    if (!payment) {
      console.error('Payment not found for callback:', invoice.api_ref);
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }

    if (event === 'payment.completed') {
      // Update payment status
      payment.status = 'completed';
      payment.transactionId = invoice.mpesa_receipt;
      payment.processedAt = new Date();
      await payment.save();

      // Update user's wallet
      const employer = await UserModel.findById(payment.employerId);
      
      if (payment.type === 'subscription') {
        // Handle subscription payment
        employer.subscription = {
          status: 'active',
          type: 'premium',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lastPayment: payment.amount
        };
      } else {
        // Regular wallet top-up
        employer.wallet.balance += payment.amount;
      }
      
      await employer.save();

      // Create notification
      await Notification.create({
        user: payment.employerId,
        type: 'payment_success',
        title: 'Payment Successful',
        message: `Your payment of KSH ${payment.amount} has been processed successfully`,
        data: {
          paymentId: payment._id,
          amount: payment.amount,
          type: payment.type
        },
        priority: 'normal'
      });

      // Send confirmation email
      await sendEmail({
        to: employer.email,
        subject: 'Payment Confirmation',
        template: 'payment-success',
        data: {
          userName: `${employer.profile.firstName} ${employer.profile.lastName}`,
          amount: payment.amount,
          transactionId: invoice.mpesa_receipt,
          purpose: payment.type,
          date: new Date().toLocaleString()
        }
      });

    } else if (event === 'payment.failed') {
      // Handle failed payment
      payment.status = 'failed';
      payment.failureReason = invoice.failure_reason || 'Payment failed';
      await payment.save();

      // Notify user
      await Notification.create({
        user: payment.employerId,
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Your payment of KSH ${payment.amount} has failed. Please try again.`,
        data: {
          paymentId: payment._id,
          amount: payment.amount,
          reason: payment.failureReason
        },
        priority: 'high'
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('M-PESA callback processing failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Callback processing failed' 
    });
  }
};

// Writer Management
const managePrivateWriters = async (req, res) => {
  try {
    const { action, writerId } = req.body;
    const employerId = req.user._id;

    const employer = await UserModel.findById(employerId);
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }

    if (action === 'add') {
      if (!employer.privateWriters.includes(writerId)) {
        employer.privateWriters.push(writerId);
      }
    } else if (action === 'remove') {
      employer.privateWriters = employer.privateWriters.filter(
        id => id.toString() !== writerId
      );
    }

    await employer.save();

    const privateWriters = await Writer.find({
      _id: { $in: employer.privateWriters }
    }).select('name rating completedOrders expertise');

    res.json({
      success: true,
      data: privateWriters
    });
  } catch (error) {
    console.error('Manage private writers failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update private writers'
    });
  }
};

// Payment handlers remain the same
const processPayment = async (req, res) => {
  try {
    const { amount, phone, purpose } = req.body;
    const employerId = req.user._id;

    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum payment amount is KSH 100'
      });
    }

    const payment = await Payment.create({
      employerId,
      amount,
      type: purpose,
      status: 'pending',
      mpesaPhone: phone
    });

    try {
      const mpesaResponse = await intasend.mpesaRequest({
        amount: amount,
        phone_number: phone,
        currency: 'KES',
        api_ref: payment._id.toString(),
        narrative: `Eclipse Writers - ${purpose}`,
        callback_url: `${process.env.BACKEND_URL}/api/payments/callback`
      });

      if (mpesaResponse.invoice.state === 'PENDING') {
        payment.intaSendInvoiceId = mpesaResponse.invoice.invoice_id;
        payment.intaSendTrackingId = mpesaResponse.tracking_id;
        await payment.save();

        res.json({
          success: true,
          data: {
            payment,
            message: 'Please complete the payment on your phone'
          }
        });
      } else {
        payment.status = 'failed';
        payment.failureReason = 'Failed to initiate M-PESA payment';
        await payment.save();

        res.status(400).json({
          success: false,
          message: 'Failed to initiate M-PESA payment'
        });
      }
    } catch (mpesaError) {
      console.error('M-PESA request failed:', mpesaError);
      payment.status = 'failed';
      payment.failureReason = mpesaError.message;
      await payment.save();

      res.status(400).json({
        success: false,
        message: 'M-PESA payment request failed',
        error: mpesaError.message
      });
    }
  } catch (error) {
    console.error('Payment processing failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment'
    });
  }
};

module.exports = {
  initializeCronJobs,
  getDashboardStats,
  createOrder,
  handleFileUpload,
  getFile: (req, res) => {
    try {
      const file = gfs.files.findOne({ filename: req.params.filename });
      if (!file) return res.status(404).send('File not found');
      const readStream = gfs.createReadStream(file.filename);
      readStream.pipe(res);
    } catch (error) {
      res.status(500).send('Error retrieving file');
    }
  },
  deleteFile: async (req, res) => {
    try {
      await gfs.files.deleteOne({ filename: req.params.filename });
      res.send('File deleted successfully');
    } catch (error) {
      res.status(500).send('Error deleting file');
    }
  },
  managePrivateWriters,
  processPayment,
  handleMpesaCallback,
  checkPaymentStatus: async (req, res) => {
    try {
      const payment = await Payment.findById(req.params.paymentId);
      if (!payment) return res.status(404).send('Payment not found');
      
      const statusResponse = await intasend.getPaymentStatus(payment.intaSendInvoiceId);
      res.json({
        success: true,
        data: {
          status: statusResponse.invoice.state,
          payment
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to check payment status'
      });
    }
  }
};