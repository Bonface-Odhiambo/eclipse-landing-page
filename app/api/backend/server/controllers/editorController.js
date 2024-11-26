const User = require('../models/userModels');
const Order = require('../models/orderModels');
const Payment = require('../models/paymentModels');
const Editor = require('../models/editorModels');
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
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

class AdminController {
    // Initialize scheduled tasks
    static initializeScheduledTasks() {
        try {
            logger.info('Initializing cron jobs...');

            // Auto-approval for orders and answers - runs every Sunday
            cron.schedule('0 0 * * 0', async () => {
                try {
                    logger.info('Starting weekly auto-approval process...');
                    await Promise.all([
                        AdminController.autoApproveAnswers(),
                        AdminController.autoApproveOrders()
                    ]);
                    logger.info('Weekly auto-approval process completed');
                } catch (error) {
                    logger.error('Error in weekly auto-approval process:', error);
                }
            });

            // Daily stats calculation
            cron.schedule('0 0 * * *', async () => {
                try {
                    await Promise.all([
                        AdminController.calculateDailyStats(),
                        AdminController.updateAnalytics()
                    ]);
                } catch (error) {
                    logger.error('Error in daily stats calculation:', error);
                }
            });

            // Check inactive users - every 6 hours
            cron.schedule('0 */6 * * *', async () => {
                try {
                    await AdminController.checkInactiveUsers();
                } catch (error) {
                    logger.error('Error checking inactive users:', error);
                }
            });

            // System metrics collection - every hour
            cron.schedule('0 * * * *', async () => {
                try {
                    await AdminController.collectSystemMetrics();
                } catch (error) {
                    logger.error('Error collecting system metrics:', error);
                }
            });

            logger.info('Cron jobs initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize cron jobs:', error);
            throw error;
        }
    }

    // Dashboard Statistics
    static async getDashboardStats(req, res) {
        const session = await getConnection().startSession();
        try {
            session.startTransaction();

            if (!getConnection().readyState === 1) {
                throw new Error('Database connection is not ready');
            }

            const today = new Date().setHours(0, 0, 0, 0);
            const lastMonth = new Date(today);
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            // Combined stats including Q&A and Analytics
            const [
                userStats,
                financialStats,
                orderStats,
                analyticsData,
                systemMetrics
            ] = await Promise.all([
                AdminController.getUserStats(session),
                AdminController.getFinancialStats(session, lastMonth),
                AdminController.getOrderStats(session, lastMonth),
                Analytics.findOne().sort({ date: -1 }).session(session),
                SystemMetrics.find()
                    .sort({ timestamp: -1 })
                    .limit(24)
                    .session(session)
            ]);

            // Format and send response
            const response = {
                overview: {
                    ...userStats,
                    ...financialStats.overview
                },
                financial: {
                    ...financialStats.details,
                    trends: financialStats.trends
                },
                orders: orderStats,
                analytics: analyticsData,
                systemHealth: {
                    metrics: systemMetrics,
                    status: await AdminController.getSystemStatus(session)
                }
            };

            await session.commitTransaction();
            res.json(response);
            logger.info('Dashboard statistics fetched successfully');

        } catch (err) {
            await session.abortTransaction();
            logger.error('Error fetching dashboard stats:', err);
            res.status(500).json({
                success: false,
                message: 'Error fetching dashboard statistics',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        } finally {
            session.endSession();
        }
    }

    // Helper Methods for Dashboard Stats
    static async getUserStats(session) {
        const [
            totalUsers,
            pendingDisputes,
            onlineWriters,
            onlineEmployers,
            writersWithSubscription
        ] = await Promise.all([
            User.countDocuments({}, { session }),
            Dispute.countDocuments({ status: 'pending' }, { session }),
            User.countDocuments({ role: 'writer', status: 'online' }, { session }),
            User.countDocuments({ role: 'employer', status: 'online' }, { session }),
            User.countDocuments({ 
                role: 'writer', 
                'writerProfile.hasActiveSubscription': true 
            }, { session })
        ]);

        return {
            totalUsers,
            pendingDisputes,
            onlineWriters,
            onlineEmployers,
            writersWithSubscription
        };
    }

    static async getFinancialStats(session, lastMonth) {
        const [escrowAmount, platformRevenue, monthlyRevenue] = await Promise.all([
            Payment.aggregate([
                { $match: { status: 'escrowed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).session(session),
            Payment.aggregate([
                { $match: { type: 'platform_fee', status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).session(session),
            Payment.aggregate([
                {
                    $match: {
                        status: 'completed',
                        createdAt: { $gte: lastMonth }
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).session(session)
        ]);

        return {
            overview: {
                totalRevenue: platformRevenue[0]?.total || 0,
                escrowBalance: escrowAmount[0]?.total || 0
            },
            details: {
                escrowedAmount: escrowAmount[0]?.total || 0,
                platformRevenue: platformRevenue[0]?.total || 0,
                monthlyRevenue: monthlyRevenue[0]?.total || 0
            },
            trends: await Payment.aggregate([
                {
                    $match: {
                        createdAt: { $gte: lastMonth }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                        },
                        total: { $sum: '$amount' }
                    }
                },
                { $sort: { '_id': 1 } }
            ]).session(session)
        };
    }

    static async getOrderStats(session, lastMonth) {
      const orderStats = await Order.aggregate([
          {
              $facet: {
                  statusCount: [
                      {
                          $group: {
                              _id: '$status',
                              count: { $sum: 1 },
                              totalValue: { $sum: '$amount' }
                          }
                      }
                  ],
                  recentTrends: [
                      {
                          $match: {
                              createdAt: { $gte: lastMonth }
                          }
                      },
                      {
                          $group: {
                              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                              count: { $sum: 1 },
                              revenue: { $sum: '$amount' }
                          }
                      },
                      { $sort: { '_id': 1 } }
                  ],
                  qualityMetrics: [
                      {
                          $match: {
                              status: 'completed'
                          }
                      },
                      {
                          $group: {
                              _id: null,
                              averageRating: { $avg: '$rating' },
                              completionRate: {
                                  $avg: {
                                      $cond: [
                                          { $eq: ['$status', 'completed'] },
                                          1,
                                          0
                                      ]
                                  }
                              },
                              disputeRate: {
                                  $avg: {
                                      $cond: [{ $eq: ['$isDisputed', true] }, 1, 0]
                                  }
                              }
                          }
                      }
                  ]
              }
          }
      ]).session(session);

      return {
          status: orderStats[0].statusCount,
          trends: orderStats[0].recentTrends,
          quality: orderStats[0].qualityMetrics[0] || {
              averageRating: 0,
              completionRate: 0,
              disputeRate: 0
          }
      };
  }

  static async getSystemStatus(session) {
      try {
          const [
              settings,
              latestErrors,
              metrics
          ] = await Promise.all([
              AdminSettings.findOne().session(session),
              ErrorLog.find()
                  .sort({ timestamp: -1 })
                  .limit(5)
                  .session(session),
              SystemMetrics.find()
                  .sort({ timestamp: -1 })
                  .limit(1)
                  .session(session)
          ]);

          return {
              maintenanceMode: settings?.system?.maintenanceMode || false,
              version: settings?.system?.version,
              lastUpdate: settings?.system?.lastUpdate,
              recentErrors: latestErrors,
              currentMetrics: metrics[0]
          };
      } catch (error) {
          logger.error('Error getting system status:', error);
          throw error;
      }
  }

  static async collectSystemMetrics() {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          const metrics = {
              timestamp: new Date(),
              users: {
                  total: await User.countDocuments({}, { session }),
                  active: await User.countDocuments({ status: 'active' }, { session }),
                  online: await User.countDocuments({ 
                      status: 'online',
                      'meta.lastActive': { $gte: new Date(Date.now() - 15 * 60 * 1000) }
                  }, { session })
              },
              orders: {
                  pending: await Order.countDocuments({ status: 'pending' }, { session }),
                  active: await Order.countDocuments({ status: 'in_progress' }, { session }),
                  completed: await Order.countDocuments({ status: 'completed' }, { session })
              },
              system: {
                  memory: process.memoryUsage(),
                  uptime: process.uptime(),
                  cpu: process.cpuUsage()
              }
          };

          await SystemMetrics.create([metrics], { session });
          await session.commitTransaction();
          logger.info('System metrics collected successfully');
      } catch (error) {
          await session.abortTransaction();
          logger.error('Error collecting system metrics:', error);
          throw error;
      } finally {
          session.endSession();
      }
  }

  static async autoApproveOrders() {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          const approvalThreshold = new Date();
          approvalThreshold.setDate(approvalThreshold.getDate() - 7);

          const pendingOrders = await Order.find({
              status: 'completed',
              editorReviewStatus: 'pending',
              completedAt: { $lt: approvalThreshold }
          }).session(session);

          for (const order of pendingOrders) {
              await Order.findByIdAndUpdate(
                  order._id,
                  {
                      editorReviewStatus: 'approved',
                      autoApproved: true,
                      approvedAt: new Date(),
                      approvalNotes: 'Auto-approved after 7 days of pending review'
                  },
                  { session }
              );

              // Process payments
              await Promise.all([
                  Payment.findOneAndUpdate(
                      { orderId: order._id, status: 'escrowed' },
                      {
                          status: 'completed',
                          completedAt: new Date(),
                          notes: 'Payment released through auto-approval'
                      },
                      { session }
                  ),
                  User.findByIdAndUpdate(
                      order.writer,
                      {
                          $inc: {
                              'stats.completedOrders': 1,
                              'stats.totalEarnings': order.writerPayment
                          }
                      },
                      { session }
                  )
              ]);

              // Send notifications
              await Notification.create([
                  {
                      user: order.writer,
                      type: 'order_auto_approved',
                      content: `Your order #${order.orderNumber} has been automatically approved and payment released.`,
                      reference: order._id
                  },
                  {
                      user: order.employer,
                      type: 'order_auto_approved',
                      content: `Order #${order.orderNumber} has been automatically approved after 7 days.`,
                      reference: order._id
                  }
              ], { session });
          }

          await session.commitTransaction();
          logger.info(`Auto-approved ${pendingOrders.length} orders`);
      } catch (error) {
          await session.abortTransaction();
          logger.error('Error in autoApproveOrders:', error);
          throw error;
      } finally {
          session.endSession();
      }
  }

  static async autoApproveAnswers() {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          const threshold = new Date();
          threshold.setDate(threshold.getDate() - 7);

          const pendingAnswers = await Answer.find({
              status: 'pending',
              createdAt: { $lt: threshold }
          }).session(session);

          for (const answer of pendingAnswers) {
              await Promise.all([
                  Answer.findByIdAndUpdate(
                      answer._id,
                      {
                          status: 'approved',
                          autoApproved: true,
                          approvedAt: new Date(),
                          approvalNotes: 'Auto-approved after 7 days'
                      },
                      { session }
                  ),
                  Question.findByIdAndUpdate(
                      answer.question,
                      { $inc: { approvedAnswersCount: 1 } },
                      { session }
                  ),
                  Notification.create([{
                      user: answer.author,
                      type: 'answer_auto_approved',
                      content: `Your answer has been automatically approved after 7 days.`,
                      reference: answer._id
                  }], { session })
              ]);
          }

          await session.commitTransaction();
          logger.info(`Auto-approved ${pendingAnswers.length} answers`);
      } catch (error) {
          await session.abortTransaction();
          logger.error('Error in autoApproveAnswers:', error);
          throw error;
      } finally {
          session.endSession();
      }
  }

  static async updateAnalytics() {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const analytics = {
              date: today,
              metrics: {
                  totalUsers: await User.countDocuments({}, { session }),
                  activeUsers: await User.countDocuments({ status: 'active' }, { session }),
                  totalOrders: await Order.countDocuments({}, { session }),
                  completedOrders: await Order.countDocuments({ status: 'completed' }, { session }),
                  pendingOrders: await Order.countDocuments({ status: 'pending' }, { session }),
                  totalRevenue: (await Payment.aggregate([
                      { $group: { _id: null, total: { $sum: '$amount' } } }
                  ]).session(session))[0]?.total || 0
              },
              userStats: {
                  writers: {
                      total: await User.countDocuments({ role: 'writer' }, { session }),
                      active: await User.countDocuments({ role: 'writer', status: 'active' }, { session }),
                      subscribed: await User.countDocuments({ 
                          role: 'writer', 
                          'writerProfile.hasActiveSubscription': true 
                      }, { session })
                  },
                  editors: {
                      total: await User.countDocuments({ role: 'editor' }, { session }),
                      active: await User.countDocuments({ role: 'editor', status: 'active' }, { session })
                  },
                  employers: {
                      total: await User.countDocuments({ role: 'employer' }, { session }),
                      active: await User.countDocuments({ role: 'employer', status: 'active' }, { session })
                  }
              }
          };

          await Analytics.create([analytics], { session });
          await session.commitTransaction();
          logger.info('Analytics updated successfully');
      } catch (error) {
          await session.abortTransaction();
          logger.error('Error updating analytics:', error);
          throw error;
      } finally {
          session.endSession();
      }
  }

  static async checkInactiveUsers() {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          const inactiveThreshold = new Date();
          inactiveThreshold.setDate(inactiveThreshold.getDate() - 30);

          const inactiveUsers = await User.find({
              'meta.lastActive': { $lt: inactiveThreshold },
              status: 'active'
          }).session(session);

          for (const user of inactiveUsers) {
              await Promise.all([
                  User.findByIdAndUpdate(
                      user._id,
                      { 
                          status: 'inactive',
                          'meta.deactivationDate': new Date(),
                          'meta.deactivationReason': 'Inactivity'
                      },
                      { session }
                  ),
                  Notification.create([{
                      user: user._id,
                      type: 'account_inactive',
                      content: 'Your account has been marked as inactive due to 30 days of inactivity.'
                  }], { session })
              ]);
          }

          await session.commitTransaction();
          logger.info(`Processed ${inactiveUsers.length} inactive users`);
      } catch (error) {
          await session.abortTransaction();
          logger.error('Error checking inactive users:', error);
          throw error;
      } finally {
          session.endSession();
      }
  }
}

// Initialize scheduled tasks when the controller is loaded
try {
  AdminController.initializeScheduledTasks();
} catch (error) {
  logger.error('Failed to initialize AdminController:', error);
}

module.exports = AdminController;