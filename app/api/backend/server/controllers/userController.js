const User = require('../models/userModels');
const Order = require('../models/orderModels');
const Payment = require('../models/paymentModels');
const Writer = require('../models/writerModels');
const { getConnection } = require('../config/database');
const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'users.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

class UserController {
    // User Profile Management
    static async getUserProfile(req, res) {
        const session = await getConnection().startSession();
        try {
            session.startTransaction();

            const user = await User.findById(req.user.id)
                .select('-password')
                .session(session);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Get role-specific data
            let profileData = { ...user.toObject() };

            switch (user.role) {
                case 'writer':
                    const writerStats = await Order.aggregate([
                        {
                            $match: { writer: user._id }
                        },
                        {
                            $group: {
                                _id: null,
                                totalOrders: { $sum: 1 },
                                completedOrders: {
                                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                                },
                                totalEarnings: {
                                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$writerPayment', 0] }
                                },
                                averageRating: { $avg: '$rating' }
                            }
                        }
                    ]).session(session);

                    profileData.writerStats = writerStats[0] || {
                        totalOrders: 0,
                        completedOrders: 0,
                        totalEarnings: 0,
                        averageRating: 0
                    };
                    break;

                case 'employer':
                    const employerStats = await Order.aggregate([
                        {
                            $match: { employer: user._id }
                        },
                        {
                            $group: {
                                _id: null,
                                totalOrders: { $sum: 1 },
                                activeOrders: {
                                    $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
                                },
                                totalSpent: {
                                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
                                }
                            }
                        }
                    ]).session(session);

                    profileData.employerStats = employerStats[0] || {
                        totalOrders: 0,
                        activeOrders: 0,
                        totalSpent: 0
                    };
                    break;

                case 'editor':
                    const editorStats = await Order.aggregate([
                        {
                            $match: { editor: user._id }
                        },
                        {
                            $group: {
                                _id: null,
                                totalReviewed: { $sum: 1 },
                                averageResponseTime: { $avg: '$reviewTime' }
                            }
                        }
                    ]).session(session);

                    profileData.editorStats = editorStats[0] || {
                        totalReviewed: 0,
                        averageResponseTime: 0
                    };
                    break;

                case 'admin':
                    const adminStats = await Promise.all([
                        User.countDocuments({}, { session }),
                        Order.countDocuments({ status: 'pending_review' }, { session }),
                        Payment.countDocuments({ status: 'pending' }, { session })
                    ]);

                    profileData.adminStats = {
                        totalUsers: adminStats[0],
                        pendingReviews: adminStats[1],
                        pendingPayments: adminStats[2]
                    };
                    break;
            }

            await session.commitTransaction();
            res.json(profileData);

        } catch (error) {
            await session.abortTransaction();
            logger.error('Error in getUserProfile:', error);
            res.status(500).json({
                message: 'Error fetching user profile',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            session.endSession();
        }
    }

    static async updateUserProfile(req, res) {
        const session = await getConnection().startSession();
        try {
            session.startTransaction();

            const { name, phoneNumber, specialties, bio, hourlyRate, availability } = req.body;

            // Base update fields
            let updateFields = {
                name,
                phoneNumber,
                'meta.lastUpdated': new Date()
            };

            // Role-specific updates
            const user = await User.findById(req.user.id).session(session);
            
            switch (user.role) {
                case 'writer':
                    updateFields = {
                        ...updateFields,
                        'writerProfile.specialties': specialties,
                        'writerProfile.bio': bio,
                        'writerProfile.hourlyRate': hourlyRate,
                        'writerProfile.availability': availability
                    };
                    break;

                case 'employer':
                    updateFields = {
                        ...updateFields,
                        'employerProfile.preferredCategories': specialties,
                        'employerProfile.company': req.body.company
                    };
                    break;

                case 'editor':
                    updateFields = {
                        ...updateFields,
                        'editorProfile.specialties': specialties,
                        'editorProfile.availability': availability
                    };
                    break;
            }

            const updatedUser = await User.findByIdAndUpdate(
                req.user.id,
                { $set: updateFields },
                { new: true, session }
            ).select('-password');

            // Log profile update
            await SystemMetrics.create([{
                timestamp: new Date(),
                type: 'profile_update',
                details: {
                    userId: req.user.id,
                    role: user.role,
                    updatedFields: Object.keys(updateFields)
                }
            }], { session });

            await session.commitTransaction();
            res.json(updatedUser);

        } catch (error) {
            await session.abortTransaction();
            logger.error('Error in updateUserProfile:', error);
            res.status(500).json({
                message: 'Error updating user profile',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            session.endSession();
        }
    }

    static async checkSubscription(req, res) {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          const user = await User.findById(req.user.id).session(session);
          
          if (user.role !== 'writer') {
              return res.status(400).json({ 
                  message: 'Subscription check is only applicable for writers' 
              });
          }

          const subscription = await Subscription.findOne({
              user: req.user.id,
              status: 'active',
              endDate: { $gt: new Date() }
          })
          .sort({ endDate: -1 })
          .session(session);

          // Update subscription metrics
          await Analytics.findOneAndUpdate(
              { date: new Date().setHours(0, 0, 0, 0) },
              {
                  $inc: { 'metrics.subscriptionChecks': 1 }
              },
              { session, upsert: true }
          );

          await session.commitTransaction();

          res.json({
              isSubscribed: !!subscription,
              subscription,
              features: subscription?.features || [],
              expiresAt: subscription?.endDate
          });

      } catch (error) {
          await session.abortTransaction();
          logger.error('Error in checkSubscription:', error);
          res.status(500).json({
              message: 'Error checking subscription status',
              error: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
      } finally {
          session.endSession();
      }
  }

  static async makeWriterPrivate(req, res) {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          const { writerId } = req.params;
          
          // Verify employer status and writer existence
          const [employer, writer] = await Promise.all([
              User.findById(req.user.id).session(session),
              User.findById(writerId).session(session)
          ]);

          if (!writer) {
              return res.status(404).json({ message: 'Writer not found' });
          }

          if (employer.role !== 'employer') {
              return res.status(403).json({ message: 'Only employers can make writers private' });
          }

          // Check if already private
          if (!writer.privateEmployers.includes(employer._id)) {
              writer.privateEmployers.push(employer._id);
              await writer.save({ session });

              // Create notification for writer
              await Notification.create([{
                  user: writerId,
                  type: 'writer_made_private',
                  content: `${employer.name} has added you as a private writer`,
                  reference: employer._id
              }], { session });

              // Update employer's private writers count
              await User.findByIdAndUpdate(
                  employer._id,
                  { $inc: { 'employerProfile.privateWritersCount': 1 } },
                  { session }
              );
          }

          await session.commitTransaction();
          res.json({ message: 'Writer added to private list successfully' });

      } catch (error) {
          await session.abortTransaction();
          logger.error('Error in makeWriterPrivate:', error);
          res.status(500).json({
              message: 'Error making writer private',
              error: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
      } finally {
          session.endSession();
      }
  }

  static async removePrivateWriter(req, res) {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          const { writerId } = req.params;
          
          const [employer, writer] = await Promise.all([
              User.findById(req.user.id).session(session),
              User.findById(writerId).session(session)
          ]);

          if (!writer) {
              return res.status(404).json({ message: 'Writer not found' });
          }

          if (employer.role !== 'employer') {
              return res.status(403).json({ message: 'Only employers can remove private writers' });
          }

          writer.privateEmployers = writer.privateEmployers.filter(
              id => id.toString() !== employer._id.toString()
          );
          await writer.save({ session });

          // Notify writer
          await Notification.create([{
              user: writerId,
              type: 'writer_removed_private',
              content: `${employer.name} has removed you from their private writers list`,
              reference: employer._id
          }], { session });

          // Update employer's private writers count
          await User.findByIdAndUpdate(
              employer._id,
              { $inc: { 'employerProfile.privateWritersCount': -1 } },
              { session }
          );

          await session.commitTransaction();
          res.json({ message: 'Writer removed from private list successfully' });

      } catch (error) {
          await session.abortTransaction();
          logger.error('Error in removePrivateWriter:', error);
          res.status(500).json({
              message: 'Error removing private writer',
              error: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
      } finally {
          session.endSession();
      }
  }

  static async getPrivateWriters(req, res) {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          const employer = await User.findById(req.user.id).session(session);

          if (employer.role !== 'employer') {
              return res.status(403).json({ message: 'Only employers can view private writers' });
          }

          const privateWriters = await User.aggregate([
              {
                  $match: {
                      role: 'writer',
                      privateEmployers: employer._id
                  }
              },
              {
                  $lookup: {
                      from: 'orders',
                      let: { writerId: '$_id' },
                      pipeline: [
                          {
                              $match: {
                                  $expr: {
                                      $and: [
                                          { $eq: ['$writer', '$$writerId'] },
                                          { $eq: ['$employer', employer._id] }
                                      ]
                                  }
                              }
                          }
                      ],
                      as: 'orderHistory'
                  }
              },
              {
                  $project: {
                      password: 0,
                      privateEmployers: 0,
                      'orderHistory.content': 0
                  }
              }
          ]).session(session);

          await session.commitTransaction();
          res.json(privateWriters);

      } catch (error) {
          await session.abortTransaction();
          logger.error('Error in getPrivateWriters:', error);
          res.status(500).json({
              message: 'Error fetching private writers',
              error: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
      } finally {
          session.endSession();
      }
  }

  // Role-specific methods
  static async getWriterDashboard(req, res) {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          if (req.user.role !== 'writer') {
              return res.status(403).json({ message: 'Access denied' });
          }

          const [
              activeOrders,
              earnings,
              reviews,
              subscription
          ] = await Promise.all([
              Order.find({
                  writer: req.user.id,
                  status: { $in: ['in_progress', 'pending_review'] }
              }).session(session),
              Payment.aggregate([
                  {
                      $match: {
                          recipient: req.user.id,
                          status: 'completed'
                      }
                  },
                  {
                      $group: {
                          _id: null,
                          total: { $sum: '$amount' },
                          lastMonth: {
                              $sum: {
                                  $cond: [
                                      { 
                                          $gte: [
                                              '$completedAt',
                                              new Date(new Date().setMonth(new Date().getMonth() - 1))
                                          ]
                                      },
                                      '$amount',
                                      0
                                  ]
                              }
                          }
                      }
                  }
              ]).session(session),
              Order.aggregate([
                  {
                      $match: {
                          writer: req.user.id,
                          status: 'completed',
                          rating: { $exists: true }
                      }
                  },
                  {
                      $group: {
                          _id: null,
                          averageRating: { $avg: '$rating' },
                          totalReviews: { $sum: 1 }
                      }
                  }
              ]).session(session),
              Subscription.findOne({
                  user: req.user.id,
                  status: 'active',
                  endDate: { $gt: new Date() }
              }).session(session)
          ]);

          await session.commitTransaction();

          res.json({
              activeOrders: {
                  count: activeOrders.length,
                  orders: activeOrders
              },
              earnings: {
                  total: earnings[0]?.total || 0,
                  lastMonth: earnings[0]?.lastMonth || 0
              },
              reviews: {
                  average: reviews[0]?.averageRating || 0,
                  total: reviews[0]?.totalReviews || 0
              },
              subscription: {
                  active: !!subscription,
                  expiresAt: subscription?.endDate,
                  plan: subscription?.plan
              }
          });

      } catch (error) {
          await session.abortTransaction();
          logger.error('Error in getWriterDashboard:', error);
          res.status(500).json({
              message: 'Error fetching writer dashboard',
              error: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
      } finally {
          session.endSession();
      }
  }

  static async getEditorDashboard(req, res) {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          if (req.user.role !== 'editor') {
              return res.status(403).json({ message: 'Access denied' });
          }

          const [
              pendingReviews,
              completedReviews,
              performanceMetrics
          ] = await Promise.all([
              Order.find({
                  status: 'pending_review',
                  editor: req.user.id
              }).session(session),
              Order.countDocuments({
                  editor: req.user.id,
                  status: 'completed'
              }).session(session),
              Order.aggregate([
                  {
                      $match: {
                          editor: req.user.id,
                          status: 'completed'
                      }
                  },
                  {
                      $group: {
                          _id: null,
                          averageResponseTime: { $avg: '$reviewTime' },
                          totalReviewed: { $sum: 1 }
                      }
                  }
              ]).session(session)
          ]);

          await session.commitTransaction();

          res.json({
              pendingReviews: {
                  count: pendingReviews.length,
                  reviews: pendingReviews
              },
              completedReviews,
              performance: performanceMetrics[0] || {
                  averageResponseTime: 0,
                  totalReviewed: 0
              }
          });

      } catch (error) {
          await session.abortTransaction();
          logger.error('Error in getEditorDashboard:', error);
          res.status(500).json({
              message: 'Error fetching editor dashboard',
              error: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
      } finally {
          session.endSession();
      }
  }
}

// Export the controller
module.exports = UserController;