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
                systemMetricsData
            ] = await Promise.all([
                this.getUserStats(session),
                this.getFinancialStats(session, new Date()),
                this.getOrderStats(session, new Date()),
                Admin.findOne().sort({ date: -1 }).session(session),
                this.getSystemMetrics(session)
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
                    metrics: systemMetricsData.metrics,
                    status: systemMetricsData.status
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
        // Implementation remains the same
    }

    async getFinancialStats(session, lastMonth) {
        // Implementation remains the same
    }

    async getOrderStats(session, date) {
        // Placeholder for fetching order statistics (implement as needed)
        return {};
    }

    async getSystemMetrics(session) {
        try {
            const [metrics, settings] = await Promise.all([
                Admin.find().sort({ timestamp: -1 }).limit(24).session(session),
                Admin.findOne().session(session)
            ]);

            return {
                metrics,
                status: {
                    maintenanceMode: settings?.system?.maintenanceMode || false,
                    version: settings?.system?.version,
                    lastUpdate: settings?.system?.lastUpdate
                }
            };
        } catch (error) {
            this.logger.error('Error fetching system metrics:', error);
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
