const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const qualityMetricsSchema = new Schema({
    grammar: {
        type: Boolean,
        required: [true, 'Grammar check is required'],
        default: false
    },
    noAiUse: {
        type: Boolean,
        required: [true, 'AI use check is required'],
        default: false
    },
    noPlagiarism: {
        type: Boolean,
        required: [true, 'Plagiarism check is required'],
        default: false
    },
    noAiHumanizers: {
        type: Boolean,
        required: [true, 'AI humanizer check is required'],
        default: false
    },
    properReferencing: {
        type: Boolean,
        required: [true, 'Reference check is required'],
        default: false
    },
    properFormatting: {
        type: Boolean,
        required: [true, 'Format check is required'],
        default: false
    },
    thesisStatement: {
        type: Boolean,
        required: [true, 'Thesis statement check is required'],
        default: false
    },
    topicSentences: {
        type: Boolean,
        required: [true, 'Topic sentences check is required'],
        default: false
    },
    concludingSentences: {
        type: Boolean,
        required: [true, 'Concluding sentences check is required'],
        default: false
    }
}, {
    _id: false
});

const contentFeedbackSchema = new Schema({
    section: {
        type: String,
        required: true,
        enum: ['introduction', 'bodyParagraphs', 'conclusion', 'references']
    },
    startIndex: {
        type: Number,
        required: true
    },
    endIndex: {
        type: Number,
        required: true
    },
    comment: {
        type: String,
        required: true,
        trim: true,
        maxLength: 1000
    },
    type: {
        type: String,
        required: true,
        enum: ['suggestion', 'correction', 'praise']
    }
}, {
    _id: true,
    timestamps: true
});

const paperReviewSchema = new Schema({
    paper: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: [true, 'Paper reference is required']
    },
    editor: {
        type: Schema.Types.ObjectId,
        ref: 'Editor',
        required: [true, 'Editor reference is required']
    },
    status: {
        type: String,
        required: [true, 'Review status is required'],
        enum: ['approved', 'needs_revision', 'rejected'],
        default: 'needs_revision'
    },
    notes: {
        type: String,
        required: [true, 'Review notes are required'],
        trim: true,
        minLength: [50, 'Review notes must be at least 50 characters long'],
        maxLength: [5000, 'Review notes cannot exceed 5000 characters']
    },
    qualityMetrics: {
        type: qualityMetricsSchema,
        required: [true, 'Quality metrics are required']
    },
    contentFeedback: [contentFeedbackSchema],
    reviewedDocument: {
        type: String,
        required: [true, 'Reviewed document content is required']
    },
    originalDocument: {
        type: String,
        required: [true, 'Original document content is required']
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    reviewTime: {
        type: Number,
        required: true,
        min: [0, 'Review time cannot be negative']
    },
    revisionCount: {
        type: Number,
        default: 0,
        min: 0
    },
    score: {
        type: Number,
        required: true,
        min: [0, 'Score cannot be below 0'],
        max: [100, 'Score cannot exceed 100']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for improved query performance
paperReviewSchema.index({ paper: 1, editor: 1 }, { unique: true });
paperReviewSchema.index({ editor: 1, submittedAt: -1 });
paperReviewSchema.index({ status: 1, submittedAt: -1 });

// Virtual field for calculating review duration
paperReviewSchema.virtual('reviewDuration').get(function() {
    return this.reviewTime / (60 * 60 * 1000); // Convert to hours
});

// Method to calculate quality score
paperReviewSchema.methods.calculateQualityScore = function() {
    const metrics = this.qualityMetrics;
    const totalChecks = Object.keys(metrics).length;
    const passedChecks = Object.values(metrics).filter(Boolean).length;
    return (passedChecks / totalChecks) * 100;
};

// Static method to get editor's recent reviews
paperReviewSchema.statics.getEditorReviews = async function(editorId, startDate) {
    return this.find({
        editor: editorId,
        submittedAt: { $gte: startDate }
    })
    .populate('paper', 'title orderId pageCount')
    .sort('-submittedAt');
};

// Pre-save middleware to update review time
paperReviewSchema.pre('save', function(next) {
    if (this.isNew) {
        const now = new Date();
        const assignedAt = this.paper.assignedAt;
        this.reviewTime = now - assignedAt;
    }
    next();
});

// Pre-save middleware to calculate score
paperReviewSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('qualityMetrics')) {
        this.score = this.calculateQualityScore();
    }
    next();
});

const PaperReview = mongoose.model('PaperReview', paperReviewSchema);

module.exports = PaperReview;