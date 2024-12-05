const User = require('../models/userModels');
const Order = require('../models/orderModels');
const Payment = require('../models/paymentModels');
const Editor = require('../models/editorModels');
const PaperReview = require('../models/paperReviewModels');
const Notification = require('../models/notificationModels');
const Analytics = require('../models/analyticsModels');
const { getConnection } = require('../config/database');
const cron = require('node-cron');
const winston = require('winston');

// Enhanced logging configuration
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'editor-dashboard' },
    transports: [
        new winston.transports.File({ 
            filename: 'logs/editor-error.log', 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        new winston.transports.File({ 
            filename: 'logs/editor-combined.log',
            maxsize: 5242880,
            maxFiles: 5,
        })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

class EditorDashboardController {
    static REVIEW_PAYMENT_RATE = 5; // KSH per page
    static DEFAULT_PAGE_LIMIT = 10;

    static get PAPER_QUEUE_FIELDS() {
        return '_id orderId title subject pageCount status submittedAt deadline file reviewNotes';
    }
    static async initializeScheduledTasks() {
        try {
            logger.info('Initializing editor dashboard scheduled tasks...');

            const scheduledTasks = [
                {
                    schedule: '0 * * * *',
                    task: this.updateEditorStats,
                    name: 'Editor Statistics Update'
                },
                {
                    schedule: '*/30 * * * *',
                    task: this.checkPendingReviews,
                    name: 'Pending Reviews Check'
                },
                {
                    schedule: '0 0 * * *',
                    task: this.updateQualityMetrics,
                    name: 'Quality Metrics Update'
                },
                {
                    schedule: '0 */4 * * *',
                    task: this.processEditorPayments,
                    name: 'Editor Payments Processing'
                },
                {
                    schedule: '0 */2 * * *',
                    task: this.sendReviewReminders,
                    name: 'Review Reminders'
                }
            ];

            scheduledTasks.forEach(({ schedule, task, name }) => {
                cron.schedule(schedule, async () => {
                    try {
                        await task.call(this);
                        logger.info(`Successfully completed scheduled task: ${name}`);
                    } catch (error) {
                        logger.error(`Error in scheduled task ${name}:`, {
                            error: error.message,
                            stack: error.stack,
                            taskName: name
                        });
                    }
                });
            });

            logger.info('Successfully initialized all scheduled tasks');
        } catch (error) {
            logger.error('Failed to initialize scheduled tasks:', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    static async updateEditorStats() {
        const session = await getConnection().startSession();
        try {
            session.startTransaction();
            logger.info('Starting editor statistics update');

            const editors = await Editor.find({}, null, { session });
            const updatePromises = editors.map(async (editor) => {
                try {
                    const [reviewCount, averageResponseTime, qualityScore] = await Promise.all([
                        this.getDailyReviewCount(editor._id, session),
                        this.calculateAverageResponseTime(editor._id, session),
                        this.calculateQualityScore(editor._id, session)
                    ]);

                    await Editor.findByIdAndUpdate(
                        editor._id,
                        {
                            $set: {
                                'stats.dailyReviews': reviewCount,
                                'stats.averageResponseTime': averageResponseTime,
                                'stats.qualityScore': qualityScore
                            }
                        },
                        { session }
                    );

                    logger.debug('Updated stats for editor', {
                        editorId: editor._id,
                        stats: { reviewCount, averageResponseTime, qualityScore }
                    });
                } catch (error) {
                    logger.error('Error updating individual editor stats:', {
                        editorId: editor._id,
                        error: error.message
                    });
                    throw error;
                }
            });

            await Promise.all(updatePromises);
            await session.commitTransaction();
            logger.info('Successfully completed editor statistics update');
        } catch (error) {
            await session.abortTransaction();
            logger.error('Failed to update editor statistics:', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async getDailyReviewCount(editorId, session) {
        try {
            return await Order.countDocuments({
                assignedEditor: editorId,
                status: 'reviewed',
                reviewedAt: { 
                    $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) 
                }
            }, { session });
        } catch (error) {
            logger.error('Error getting daily review count:', {
                editorId,
                error: error.message
            });
            throw error;
        }
    }

    static async calculateAverageResponseTime(editorId, session) {
        try {
            const result = await Order.aggregate([
                {
                    $match: {
                        assignedEditor: editorId,
                        status: 'reviewed'
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgTime: { 
                            $avg: { 
                                $subtract: ['$reviewedAt', '$assignedAt'] 
                            } 
                        }
                    }
                }
            ]).session(session);

            return result[0]?.avgTime || 0;
        } catch (error) {
            logger.error('Error calculating average response time:', {
                editorId,
                error: error.message
            });
            throw error;
        }
    }


    static async getPaperQueue(req, res) {
        const session = await getConnection().startSession();
        try {
            session.startTransaction();
            const editorId = req.editor._id;
            
            const { 
                status = 'pending_review',
                page = 1,
                limit = this.DEFAULT_PAGE_LIMIT,
                sortBy = 'deadline',
                search = ''
            } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const filterConditions = this.buildQueueFilterConditions(editorId, status, search);
            const sortConditions = this.buildQueueSortConditions(sortBy);

            const [papers, totalCount] = await Promise.all([
                Order.find(filterConditions)
                    .sort(sortConditions)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .populate('writer', 'name writerId')
                    .select(this.PAPER_QUEUE_FIELDS)
                    .session(session),
                Order.countDocuments(filterConditions).session(session)
            ]);

            const response = this.formatPaperQueueResponse(papers, {
                page: parseInt(page),
                limit: parseInt(limit),
                totalCount,
                status,
                sortBy
            });

            await session.commitTransaction();
            logger.info('Successfully fetched paper queue', {
                editorId,
                resultCount: papers.length,
                totalCount
            });

            res.json({ success: true, data: response });
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error fetching paper queue:', {
                error: error.message,
                stack: error.stack,
                editorId: req.editor._id
            });
            this.handleErrorResponse(res, error, 'Error fetching paper queue');
        } finally {
            session.endSession();
        }
    }

    static async submitReview(req, res) {
        const session = await getConnection().startSession();
        try {
            session.startTransaction();

            const { paperId } = req.params;
            const editorId = req.editor._id;
            const reviewData = this.validateReviewSubmission(req.body);

            const paper = await this.validateAndGetPaper(paperId, editorId, session);
            const review = await this.createPaperReview(paper, editorId, reviewData, session);
            
            await Promise.all([
                this.updatePaperStatus(paper._id, review._id, reviewData, session),
                this.createPaymentRecord(paper, editorId, session),
                this.sendReviewNotification(paper, reviewData.reviewStatus, session),
                this.updateEditorMetrics(editorId, paper, session)
            ]);

            await session.commitTransaction();
            logger.info('Successfully submitted paper review', {
                editorId,
                paperId,
                reviewId: review._id
            });

            res.json({
                success: true,
                message: 'Paper review submitted successfully',
                data: {
                    reviewId: review._id,
                    earnings: paper.pageCount * this.REVIEW_PAYMENT_RATE
                }
            });
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error submitting paper review:', {
                error: error.message,
                stack: error.stack,
                editorId: req.editor._id,
                paperId: req.params.paperId
            });
            this.handleErrorResponse(res, error, 'Error submitting paper review');
        } finally {
            session.endSession();
        }
    }

    // Helper methods for paper queue management
    static buildQueueFilterConditions(editorId, status, search) {
        const conditions = {
            assignedEditor: editorId
        };

        if (status !== 'all') {
            conditions.status = status;
        }

        if (search) {
            conditions.$or = [
                { title: { $regex: search, $options: 'i' } },
                { orderId: { $regex: search, $options: 'i' } },
                { writerId: { $regex: search, $options: 'i' } }
            ];
        }

        return conditions;
    }

    static buildQueueSortConditions(sortBy) {
        const sortConditions = {};
        switch (sortBy) {
            case 'deadline':
                sortConditions.deadline = 1;
                break;
            case 'submittedAt':
                sortConditions.submittedAt = -1;
                break;
            case 'priority':
                sortConditions.priority = -1;
                sortConditions.deadline = 1;
                break;
            default:
                sortConditions.deadline = 1;
        }
        return sortConditions;
    }

    // Helper methods for review submission
    static validateReviewSubmission(body) {
        const {
            reviewStatus,
            reviewNotes,
            qualityMetrics,
            reviewedDocument
        } = body;

        if (!reviewStatus || !reviewNotes || !qualityMetrics) {
            throw new Error('Missing required review fields');
        }

        return {
            reviewStatus,
            reviewNotes,
            qualityMetrics: this.validateQualityMetrics(qualityMetrics),
            reviewedDocument
        };
    }

    static validateQualityMetrics(metrics) {
        const requiredMetrics = [
            'grammar',
            'noAiUse',
            'noPlagiarism',
            'properReferencing',
            'properFormatting',
            'thesisStatement',
            'topicSentences',
            'concludingSentences'
        ];

        const validatedMetrics = {};
        for (const metric of requiredMetrics) {
            if (typeof metrics[metric] !== 'boolean') {
                throw new Error(`Invalid quality metric: ${metric}`);
            }
            validatedMetrics[metric] = metrics[metric];
        }

        return validatedMetrics;
    }

    static async validateAndGetPaper(paperId, editorId, session) {
        const paper = await Order.findOne({
            _id: paperId,
            assignedEditor: editorId,
            status: { $in: ['pending_review', 'under_review'] }
        }).session(session);

        if (!paper) {
            throw new Error('Paper not found or not assigned to editor');
        }

        return paper;
    }

    static async createPaperReview(paper, editorId, reviewData, session) {
        return await PaperReview.create([{
            paper: paper._id,
            editor: editorId,
            status: reviewData.reviewStatus,
            notes: reviewData.reviewNotes,
            qualityMetrics: reviewData.qualityMetrics,
            reviewedDocument: reviewData.reviewedDocument,
            submittedAt: new Date()
        }], { session });
    }

    static handleErrorResponse(res, error, defaultMessage) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            message: defaultMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
    static async getPerformanceMetrics(req, res) {
        const session = await getConnection().startSession();
        try {
            session.startTransaction();

            const editorId = req.editor._id;
            const timeframe = this.validateTimeframe(req.query.timeframe);
            const startDate = this.calculateStartDate(timeframe);

            const [qualityMetrics, speedMetrics, satisfactionMetrics, trendData] = 
                await this.gatherPerformanceData(editorId, startDate, session);

            const response = {
                timeframe,
                metrics: {
                    quality: this.formatQualityMetrics(qualityMetrics),
                    speed: this.formatSpeedMetrics(speedMetrics),
                    satisfaction: this.formatSatisfactionMetrics(satisfactionMetrics)
                },
                trends: this.formatTrendData(trendData)
            };

            await session.commitTransaction();
            logger.info('Successfully fetched performance metrics', {
                editorId,
                timeframe,
                metricsSnapshot: this.createMetricsSnapshot(response)
            });

            res.json({ success: true, data: response });
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error fetching performance metrics:', {
                error: error.message,
                stack: error.stack,
                editorId: req.editor._id
            });
            this.handleErrorResponse(res, error, 'Error fetching performance metrics');
        } finally {
            session.endSession();
        }
    }

    static async gatherPerformanceData(editorId, startDate, session) {
        try {
            return await Promise.all([
                this.getQualityMetrics(editorId, startDate, session),
                this.getSpeedMetrics(editorId, startDate, session),
                this.getSatisfactionMetrics(editorId, startDate, session),
                this.getPerformanceTrends(editorId, startDate, session)
            ]);
        } catch (error) {
            logger.error('Error gathering performance data:', {
                editorId,
                error: error.message
            });
            throw error;
        }
    }

    static async getQualityMetrics(editorId, startDate, session) {
        try {
            const reviews = await PaperReview.find({
                editor: editorId,
                submittedAt: { $gte: startDate }
            }).session(session);

            const metrics = this.calculateQualityMetrics(reviews);
            const previousMetrics = await this.calculatePreviousQualityMetrics(
                editorId, 
                startDate, 
                session
            );

            return {
                current: metrics,
                previous: previousMetrics,
                trend: this.calculateMetricsTrend(metrics, previousMetrics)
            };
        } catch (error) {
            logger.error('Error calculating quality metrics:', {
                editorId,
                error: error.message
            });
            throw error;
        }
    }

    static calculateQualityMetrics(reviews) {
        const totalReviews = reviews.length || 1;
        const metrics = reviews.reduce((acc, review) => {
            const qm = review.qualityMetrics;
            return {
                grammar: acc.grammar + (qm.grammar ? 1 : 0),
                aiDetection: acc.aiDetection + (qm.noAiUse ? 1 : 0),
                plagiarism: acc.plagiarism + (qm.noPlagiarism ? 1 : 0),
                formatting: acc.formatting + (qm.properFormatting ? 1 : 0),
                citations: acc.citations + (qm.properReferencing ? 1 : 0)
            };
        }, {
            grammar: 0,
            aiDetection: 0,
            plagiarism: 0,
            formatting: 0,
            citations: 0
        });

        return Object.entries(metrics).reduce((acc, [key, value]) => {
            acc[key] = (value / totalReviews) * 100;
            return acc;
        }, {});
    }

    static async getSpeedMetrics(editorId, startDate, session) {
        try {
            const completedReviews = await Order.find({
                assignedEditor: editorId,
                status: 'reviewed',
                reviewedAt: { $gte: startDate }
            }).session(session);

            const responseTimes = this.calculateResponseTimes(completedReviews);
            const timeDistribution = this.calculateTimeDistribution(responseTimes);
            const previousAverageTime = await this.calculatePreviousAverageTime(
                editorId, 
                startDate, 
                session
            );

            return {
                averageTime: this.calculateAverage(responseTimes),
                timeDistribution,
                trend: previousAverageTime - this.calculateAverage(responseTimes)
            };
        } catch (error) {
            logger.error('Error calculating speed metrics:', {
                editorId,
                error: error.message
            });
            throw error;
        }
    }

    static calculateResponseTimes(reviews) {
        return reviews.map(review => {
            const responseTime = (review.reviewedAt.getTime() - review.assignedAt.getTime()) / 
                               (60 * 60 * 1000); // Convert to hours
            return Math.round(responseTime * 10) / 10;
        });
    }

    static calculateTimeDistribution(responseTimes) {
        const distribution = responseTimes.reduce((acc, time) => {
            if (time <= 2) acc.under2h++;
            else if (time <= 4) acc.under4h++;
            else if (time <= 6) acc.under6h++;
            else acc.over6h++;
            return acc;
        }, { under2h: 0, under4h: 0, under6h: 0, over6h: 0 });

        const total = responseTimes.length || 1;
        return Object.entries(distribution).reduce((acc, [key, value]) => {
            acc[key] = (value / total) * 100;
            return acc;
        }, {});
    }

    static async getPerformanceTrends(editorId, startDate, session) {
        try {
            const trends = await Order.aggregate([
                {
                    $match: {
                        assignedEditor: editorId,
                        status: 'reviewed',
                        reviewedAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-%m-%d", date: "$reviewedAt" }
                        },
                        reviewCount: { $sum: 1 },
                        earnings: { $sum: { $multiply: ["$pageCount", this.REVIEW_PAYMENT_RATE] } },
                        averageResponseTime: {
                            $avg: {
                                $divide: [
                                    { $subtract: ["$reviewedAt", "$assignedAt"] },
                                    3600000 // Convert to hours
                                ]
                            }
                        }
                    }
                },
                { $sort: { '_id': 1 } }
            ]).session(session);

            return this.formatTrendData(trends);
        } catch (error) {
            logger.error('Error calculating performance trends:', {
                editorId,
                error: error.message
            });
            throw error;
        }
    }

    // Utility methods
    static validateTimeframe(timeframe) {
        const validTimeframes = ['day', 'week', 'month'];
        return validTimeframes.includes(timeframe) ? timeframe : 'week';
    }

    static calculateStartDate(timeframe) {
        const date = new Date();
        switch (timeframe) {
            case 'day':
                date.setHours(0, 0, 0, 0);
                break;
            case 'week':
                date.setDate(date.getDate() - 7);
                break;
            case 'month':
                date.setMonth(date.getMonth() - 1);
                break;
        }
        return date;
    }

    static createMetricsSnapshot(response) {
        return {
            qualityScore: response.metrics.quality.score,
            averageResponseTime: response.metrics.speed.average,
            satisfactionRate: response.metrics.satisfaction.rate
        };
    }

    static formatTrendData(trends) {
        return trends.map(day => ({
            date: day._id,
            reviewCount: day.reviewCount,
            earnings: Math.round(day.earnings * 100) / 100,
            averageResponseTime: Math.round(day.averageResponseTime * 10) / 10
        }));
    }

    static calculateAverage(numbers) {
        return numbers.length ? 
            Math.round((numbers.reduce((a, b) => a + b) / numbers.length) * 10) / 10 : 0;
    }

    static calculateMetricsTrend(current, previous) {
        return Object.entries(current).reduce((acc, [key, value]) => {
            acc[key] = value - (previous[key] || 0);
            return acc;
        }, {});
    }
}
try {
    EditorDashboardController.initializeScheduledTasks();
} catch (error) {
    logger.error('Failed to initialize EditorDashboardController:', {
        error: error.message,
        stack: error.stack
    });
}

module.exports = EditorDashboardController;






