const { Schema } = require('mongoose');

const engagementSchema = new Schema({
    // Post Metadata
    postMeta: {
        postId: {
            type: String,
            required: true,
            index: true
        },
        postUrl: {
            type: String,
            required: true
        },
        postContent: String,
        authorName: String,
        authorId: String,
        postDate: Date,
        postEngagement: {
            likes: Number,
            comments: Number,
            shares: Number
        }
    },
    
    // All Generated Comments
    generatedComments: [{
        text: String,
        tone: String,
        timestamp: Date,
        model: String,
        confidence: Number,
        isSelected: Boolean,
        isPosted: Boolean
    }],
    
    // Selected/Posted Comment Tracking
    activeComment: {
        text: String,
        selectionDate: Date,
        postDate: Date,
        isRegenerated: Boolean,
        originalCommentId: Schema.Types.ObjectId,
        metrics: {
            likes: {
                type: Number,
                default: 0
            },
            replies: {
                type: Number,
                default: 0
            },
            lastChecked: {
                type: Date,
                default: Date.now
            }
        }
    },
    
    // Historical Metrics
    metricsHistory: [{
        timestamp: Date,
        likes: Number,
        replies: Number,
        engagement: {
            clickThroughRate: Number,
            conversionRate: Number,
            responseTime: Number
        }
    }],
    
    // Performance Analysis
    performance: {
        trend: {
            likesGrowthRate: Number,
            repliesGrowthRate: Number,
            overallScore: Number
        },
        comparison: {
            industryAverage: Number,
            percentileRank: Number,
            categoryRank: Number
        },
        insights: [{
            type: { type: String },
            message: { type: String },
            timestamp: { type: Date },
            metrics: { type: Schema.Types.Mixed }
        }]
    },
    
    // Tracking Status
    trackingPeriod: {
        start: Date,
        end: Date,
        customPeriod: Number // in days
    },
    
    status: {
        isActive: {
            type: Boolean,
            default: true
        },
        rank: {
            type: Number,
            default: 0
        },
        lastUpdated: Date
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
engagementSchema.index({ 'postMeta.postId': 1 });
engagementSchema.index({ 'status.rank': -1 });
engagementSchema.index({ 'status.isActive': 1 });
engagementSchema.index({ 'performance.trend.overallScore': -1 });

// Method to calculate trend
engagementSchema.methods.calculateTrend = function() {
    if (this.metricsHistory.length < 2) {
        this.performance.trend = {
            likesGrowthRate: 0,
            repliesGrowthRate: 0,
            overallScore: 0
        };
        return;
    }
    
    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    const previous = this.metricsHistory[this.metricsHistory.length - 2];
    const timespan = Math.max(1, (latest.timestamp - previous.timestamp) / (1000 * 60 * 60 * 24)); // days
    
    this.performance.trend = {
        likesGrowthRate: (latest.likes - previous.likes) / timespan || 0,
        repliesGrowthRate: (latest.replies - previous.replies) / timespan || 0,
        overallScore: 0 // Will be calculated in calculatePerformanceScore
    };
};

// Method to calculate performance score
engagementSchema.methods.calculatePerformanceScore = function() {
    const weights = {
        likes: 0.4,
        replies: 0.3,
        growth: 0.2,
        consistency: 0.1
    };
    
    const metrics = {
        likes: this.activeComment.metrics.likes || 0,
        replies: this.activeComment.metrics.replies || 0,
        growth: (this.performance.trend.likesGrowthRate || 0) + (this.performance.trend.repliesGrowthRate || 0),
        consistency: Math.min(1, this.metricsHistory.length / 10) // Normalize to max of 1
    };
    
    // Normalize metrics to 0-10 scale
    const normalizedMetrics = {
        likes: Math.min(10, metrics.likes / 5),
        replies: Math.min(10, metrics.replies / 2),
        growth: Math.min(10, metrics.growth * 2),
        consistency: metrics.consistency * 10
    };
    
    this.performance.trend.overallScore = 
        (normalizedMetrics.likes * weights.likes) +
        (normalizedMetrics.replies * weights.replies) +
        (normalizedMetrics.growth * weights.growth) +
        (normalizedMetrics.consistency * weights.consistency);
};

// Method to add performance insight
engagementSchema.methods.addInsight = function(type, message, metrics = {}) {
    this.performance.insights.push({
        type,
        message,
        timestamp: new Date(),
        metrics
    });
};

module.exports = engagementSchema;
