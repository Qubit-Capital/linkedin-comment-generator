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
        postContent: {
            type: String,
            required: true
        },
        authorName: String,
        authorId: String,
        postDate: {
            type: Date,
            default: Date.now
        },
        postEngagement: {
            likes: Number,
            comments: Number,
            shares: Number,
            lastChecked: Date
        }
    },
    
    // Initially Generated Comments
    generatedComments: [{
        text: {
            type: String,
            required: true
        },
        tone: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        model: String,
        confidence: Number,
        isSelected: {
            type: Boolean,
            default: false
        }
    }],
    
    // Selected Comment Tracking
    selectedComment: {
        text: {
            type: String,
            required: true
        },
        selectionDate: {
            type: Date,
            default: Date.now
        },
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
        },
        performance: {
            clickThroughRate: Number,
            conversionRate: Number,
            responseTime: Number
        }
    },
    
    // Regenerated Comments (if any)
    regeneratedComments: [{
        text: String,
        tone: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        reason: String,
        isSelected: {
            type: Boolean,
            default: false
        }
    }],
    
    // Posted Comment (if different from selected)
    postedComment: {
        text: String,
        postDate: Date,
        isModified: {
            type: Boolean,
            default: false
        },
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
            lastChecked: Date
        }
    },
    
    // Engagement Tracking
    tracking: {
        period: {
            start: {
                type: Date,
                default: Date.now
            },
            end: Date,
            isActive: {
                type: Boolean,
                default: true
            }
        },
        history: [{
            timestamp: Date,
            metrics: {
                likes: Number,
                replies: Number,
                engagement: {
                    clickThroughRate: Number,
                    conversionRate: Number,
                    responseTime: Number
                }
            }
        }],
        trends: {
            likesGrowthRate: Number,
            repliesGrowthRate: Number,
            overallScore: Number,
            lastCalculated: Date
        },
        insights: [{
            type: String,
            message: String,
            timestamp: {
                type: Date,
                default: Date.now
            },
            metrics: Schema.Types.Mixed
        }]
    }
});

// Method to calculate trends
engagementSchema.methods.calculateTrends = function() {
    if (this.tracking.history.length < 2) return;
    
    const latest = this.tracking.history[this.tracking.history.length - 1];
    const previous = this.tracking.history[this.tracking.history.length - 2];
    
    this.tracking.trends = {
        likesGrowthRate: ((latest.metrics.likes - previous.metrics.likes) / previous.metrics.likes) * 100,
        repliesGrowthRate: ((latest.metrics.replies - previous.metrics.replies) / previous.metrics.replies) * 100,
        overallScore: this.calculatePerformanceScore(latest.metrics),
        lastCalculated: new Date()
    };
};

// Method to calculate performance score
engagementSchema.methods.calculatePerformanceScore = function(metrics) {
    const weights = {
        likes: 0.4,
        replies: 0.3,
        clickThrough: 0.2,
        conversion: 0.1
    };
    
    return (
        (metrics.likes * weights.likes) +
        (metrics.replies * weights.replies) +
        ((metrics.engagement?.clickThroughRate || 0) * weights.clickThrough) +
        ((metrics.engagement?.conversionRate || 0) * weights.conversion)
    );
};

// Method to add insight
engagementSchema.methods.addInsight = function(type, message, metrics = {}) {
    this.tracking.insights.push({
        type,
        message,
        timestamp: new Date(),
        metrics
    });
};

module.exports = engagementSchema;
