const cron = require('node-cron');
const User = require('../models/userModels');
const Payment = require('../models/paymentModels');
const Admin = require('../models/adminModels');
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
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

class AdminController {
    constructor() {
        this.logger = logger;

        // Initialize cron jobs
        this.initializeCronJobs();
    }

    initializeCronJobs() {
        // Schedule daily analytics task at midnight
        cron.schedule('0 0 * * *', async () => {
            this.logger.info('Running daily analytics job...');
            try {
                const session = await getConnection().startSession();
                session.startTransaction();
                try {
                    const lastMonth = new Date();
                    lastMonth.setMonth(lastMonth.getMonth() - 1);

                    const financialStats = await this.getFinancialStats(session, lastMonth);
                    const userStats = await this.getUserStats(session);

                    this.logger.info('Daily analytics job completed successfully', {
                        financialStats,
                        userStats
                    });

                    await session.commitTransaction();
                } catch (error) {
                    await session.abortTransaction();
                    this.logger.error('Error during daily analytics job:', error);
                } finally {
                    session.endSession();
                }
            } catch (error) {
                this.logger.error('Failed to execute daily analytics job:', error);
            }
        });

        // Additional cron jobs can be added here
        this.logger.info('Cron jobs initialized successfully.');
    }

    async getDashboardStats(req, res) {
        const session = await getConnection().startSession();
        try {
            session.startTransaction();

            const [
                userStats,
                financialStats,
                orderStats,
                analyticsData,
                systemMetrics
            ] = await Promise.all([
                this.getUserStats(session),
                this.getFinancialStats(session, new Date()),
                this.getOrderStats(session, new Date()),
                Admin.findOne().sort({ date: -1 }).session(session),
                Admin.find().sort({ timestamp: -1 }).limit(24).session(session)
            ]);

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
                    status: await this.getSystemStatus(session)
                }
            };

            await session.commitTransaction();
            res.json(response);
            this.logger.info('Dashboard statistics fetched successfully');
        } catch (err) {
            await session.abortTransaction();
            this.logger.error('Error fetching dashboard stats:', err);
            res.status(500).json({
                success: false,
                message: 'Error fetching dashboard statistics',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        } finally {
            session.endSession();
        }
    }

    async getUserStats(session) {
        const [
            totalUsers,
            pendingDisputes,
            onlineWriters,
            onlineEmployers,
            writersWithSubscription
        ] = await Promise.all([
            User.countDocuments({}, { session }),
            Admin.countDocuments({ status: 'pending' }, { session }),
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

    async getFinancialStats(session, lastMonth) {
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

    async getSystemStatus(session) {
        try {
            const [
                settings,
                latestErrors,
                metrics
            ] = await Promise.all([
                Admin.findOne().session(session),
                Admin.find().sort({ timestamp: -1 }).limit(5).session(session),
                Admin.find().sort({ timestamp: -1 }).limit(1).session(session)
            ]);

            return {
                maintenanceMode: settings?.system?.maintenanceMode || false,
                version: settings?.system?.version,
                lastUpdate: settings?.system?.lastUpdate,
                recentErrors: latestErrors,
                currentMetrics: metrics[0]
            };
        } catch (error) {
            this.logger.error('Error getting system status:', error);
            throw error;
        }
    }
}

// Create a single instance
const adminController = new AdminController();

// Export the instance with bound methods
module.exports = {
    getDashboardStats: adminController.getDashboardStats.bind(adminController)
};
