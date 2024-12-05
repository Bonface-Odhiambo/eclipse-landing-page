const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const metricDataSchema = new Schema({
    value: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const editorMetricsSchema = new Schema({
    editorId: {
        type: Schema.Types.ObjectId,
        ref: 'Editor',
        required: true
    },
    dailyReviews: [metricDataSchema],
    averageResponseTime: [metricDataSchema],
    qualityScore: [metricDataSchema],
    satisfactionRate: [metricDataSchema],
    earnings: [metricDataSchema],
    activeTime: [metricDataSchema]
}, { _id: false });

const systemMetricsSchema = new Schema({
    totalActiveEditors: [metricDataSchema],
    averageQueueTime: [metricDataSchema],
    totalReviews: [metricDataSchema],
    systemLoad: [metricDataSchema],
    errorRate: [metricDataSchema],
    averageProcessingTime: [metricDataSchema]
}, { _id: false });

const analyticsSchema = new Schema({
    date: {
        type: Date,
        required: true,
        unique: true
    },
    editorMetrics: [editorMetricsSchema],
    systemMetrics: {
        type: systemMetricsSchema,
        required: true
    },
    aggregateMetrics: {
        totalReviews: {
            type: Number,
            default: 0
        },
        averageQualityScore: {
            type: Number,
            default: 0
        },
        averageResponseTime: {
            type: Number,
            default: 0
        },
        totalEarnings: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Indexes for query optimization
analyticsSchema.index({ date: -1 });
analyticsSchema.index({ 'editorMetrics.editorId': 1, date: -1 });

// Static methods for data aggregation
analyticsSchema.statics.getEditorPerformance = async function(editorId, startDate, endDate) {
    const metrics = await this.aggregate([
        {
            $match: {
                date: { $gte: startDate, $lte: endDate },
                'editorMetrics.editorId': mongoose.Types.ObjectId(editorId)
            }
        },
        {
            $unwind: '$editorMetrics'
        },
        {
            $match: {
                'editorMetrics.editorId': mongoose.Types.ObjectId(editorId)
            }
        },
        {
            $group: {
                _id: null,
                averageQualityScore: { $avg: '$editorMetrics.qualityScore.value' },
                averageResponseTime: { $avg: '$editorMetrics.averageResponseTime.value' },
                totalReviews: { $sum: '$editorMetrics.dailyReviews.value' },
                totalEarnings: { $sum: '$editorMetrics.earnings.value' },
                satisfactionRate: { $avg: '$editorMetrics.satisfactionRate.value' }
            }
        }
    ]);

    return metrics[0] || null;
};

analyticsSchema.statics.getSystemPerformance = async function(startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: null,
                averageQueueTime: { $avg: '$systemMetrics.averageQueueTime.value' },
                averageSystemLoad: { $avg: '$systemMetrics.systemLoad.value' },
                totalActiveEditors: { $avg: '$systemMetrics.totalActiveEditors.value' },
                errorRate: { $avg: '$systemMetrics.errorRate.value' },
                processingTime: { $avg: '$systemMetrics.averageProcessingTime.value' }
            }
        }
    ]);
};

analyticsSchema.statics.getTrends = async function(startDate, endDate, interval = 'day') {
    const groupByDate = interval === 'hour' ? { $hour: '$date' } : 
                       interval === 'week' ? { $week: '$date' } : 
                       { $dateToString: { format: '%Y-%m-%d', date: '$date' } };

    return this.aggregate([
        {
            $match: {
                date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: groupByDate,
                totalReviews: { $sum: '$aggregateMetrics.totalReviews' },
                averageQualityScore: { $avg: '$aggregateMetrics.averageQualityScore' },
                averageResponseTime: { $avg: '$aggregateMetrics.averageResponseTime' },
                totalEarnings: { $sum: '$aggregateMetrics.totalEarnings' }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

// Instance method to update metrics
analyticsSchema.methods.updateEditorMetrics = async function(editorId, metrics) {
    const editorMetricIndex = this.editorMetrics.findIndex(
        em => em.editorId.toString() === editorId.toString()
    );

    const metricData = {
        timestamp: new Date(),
        ...metrics
    };

    if (editorMetricIndex === -1) {
        this.editorMetrics.push({
            editorId,
            ...Object.keys(metrics).reduce((acc, key) => {
                acc[key] = [{ value: metrics[key], timestamp: new Date() }];
                return acc;
            }, {})
        });
    } else {
        Object.keys(metrics).forEach(key => {
            this.editorMetrics[editorMetricIndex][key].push({
                value: metrics[key],
                timestamp: new Date()
            });
        });
    }

    await this.save();
};

// Instance method to update system metrics
analyticsSchema.methods.updateSystemMetrics = async function(metrics) {
    Object.keys(metrics).forEach(key => {
        this.systemMetrics[key].push({
            value: metrics[key],
            timestamp: new Date()
        });
    });

    await this.save();
};

// Pre-save middleware to calculate aggregate metrics
analyticsSchema.pre('save', function(next) {
    if (this.editorMetrics.length > 0) {
        this.aggregateMetrics = this.editorMetrics.reduce((acc, editor) => {
            const latestMetrics = {
                reviews: editor.dailyReviews[editor.dailyReviews.length - 1]?.value || 0,
                quality: editor.qualityScore[editor.qualityScore.length - 1]?.value || 0,
                response: editor.averageResponseTime[editor.averageResponseTime.length - 1]?.value || 0,
                earnings: editor.earnings[editor.earnings.length - 1]?.value || 0
            };

            acc.totalReviews += latestMetrics.reviews;
            acc.averageQualityScore += latestMetrics.quality;
            acc.averageResponseTime += latestMetrics.response;
            acc.totalEarnings += latestMetrics.earnings;

            return acc;
        }, {
            totalReviews: 0,
            averageQualityScore: 0,
            averageResponseTime: 0,
            totalEarnings: 0
        });

        const editorCount = this.editorMetrics.length;
        this.aggregateMetrics.averageQualityScore /= editorCount;
        this.aggregateMetrics.averageResponseTime /= editorCount;
    }

    next();
});

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;