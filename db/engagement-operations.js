const Engagement = require('./models/Engagement');
const Comment = require('./models/Comment');

/**
 * Start tracking engagement for a comment
 */
async function startEngagementTracking(comment, postUrl) {
    try {
        const engagement = new Engagement({
            postMeta: {
                postId: comment.postId,
                postUrl: postUrl,
                postContent: comment.text,
                postDate: new Date()
            },
            activeComment: {
                text: comment.text,
                selectionDate: new Date(),
                postDate: new Date(),
                isRegenerated: false,
                metrics: comment.metrics || {
                    likes: 0,
                    replies: 0,
                    lastChecked: new Date()
                }
            },
            trackingPeriod: {
                start: new Date(),
                customPeriod: 30 // Default 30 days tracking
            },
            status: {
                lastUpdated: new Date()
            }
        });

        await engagement.save();
        return engagement;
    } catch (error) {
        console.error('Error starting engagement tracking:', error);
        throw error;
    }
}

/**
 * Update engagement metrics and analyze performance
 */
async function updateEngagementMetrics(engagementId, metrics) {
    try {
        const engagement = await Engagement.findById(engagementId);
        if (!engagement) {
            throw new Error('Engagement record not found');
        }

        // Update active comment metrics
        engagement.activeComment.metrics = {
            likes: metrics.likes,
            replies: metrics.replies,
            lastChecked: new Date()
        };

        // Add to metrics history
        engagement.metricsHistory.push({
            timestamp: new Date(),
            likes: metrics.likes,
            replies: metrics.replies,
            engagement: {
                clickThroughRate: metrics.clickThroughRate,
                conversionRate: metrics.conversionRate,
                responseTime: metrics.responseTime
            }
        });

        // Calculate trends
        if (engagement.metricsHistory.length > 1) {
            const previous = engagement.metricsHistory[engagement.metricsHistory.length - 2];
            const current = engagement.metricsHistory[engagement.metricsHistory.length - 1];
            
            engagement.trends = {
                likesGrowthRate: ((current.likes - previous.likes) / previous.likes) * 100,
                repliesGrowthRate: ((current.replies - previous.replies) / previous.replies) * 100,
                overallScore: calculatePerformanceScore(current)
            };
        }

        // Generate insights
        engagement.insights = generateInsights(engagement);

        engagement.status.lastUpdated = new Date();
        await engagement.save();
        return engagement;
    } catch (error) {
        console.error('Error updating engagement metrics:', error);
        throw error;
    }
}

/**
 * Calculate performance score based on metrics
 */
function calculatePerformanceScore(metrics) {
    const weights = {
        likes: 0.4,
        replies: 0.3,
        clickThrough: 0.2,
        conversion: 0.1
    };

    return (
        metrics.likes * weights.likes +
        metrics.replies * weights.replies +
        (metrics.engagement?.clickThroughRate || 0) * weights.clickThrough +
        (metrics.engagement?.conversionRate || 0) * weights.conversion
    );
}

/**
 * Generate insights based on performance metrics
 */
function generateInsights(engagement) {
    const insights = [];
    const current = engagement.metricsHistory[engagement.metricsHistory.length - 1];

    // Response time insight
    if (current.engagement?.responseTime < 60) {
        insights.push({
            type: 'engagement',
            message: 'Quick response time indicates high relevance',
            timestamp: new Date(),
            metrics: current
        });
    }

    // Growth rate insights
    if (engagement.trends?.likesGrowthRate > 50) {
        insights.push({
            type: 'growth',
            message: 'Significant increase in likes',
            timestamp: new Date(),
            metrics: current
        });
    }

    return insights;
}

/**
 * Get top performing comments with detailed analysis
 */
async function getTopComments(limit = 5) {
    try {
        const engagements = await Engagement.find()
            .sort({ 'trends.overallScore': -1 })
            .limit(limit);

        return engagements.map(e => ({
            text: e.activeComment.text,
            metrics: e.activeComment.metrics,
            score: e.trends?.overallScore || 0
        }));
    } catch (error) {
        console.error('Error getting top comments:', error);
        throw error;
    }
}

/**
 * Get engagement history with trend analysis
 */
async function getEngagementHistory(engagementId) {
    try {
        const engagement = await Engagement.findById(engagementId);
        if (!engagement) {
            throw new Error('Engagement record not found');
        }

        return {
            historyEntries: engagement.metricsHistory.length,
            trends: engagement.trends,
            insights: engagement.insights
        };
    } catch (error) {
        console.error('Error getting engagement history:', error);
        throw error;
    }
}

/**
 * Compare comment performance with industry averages
 */
async function getPerformanceComparison(engagementId) {
    try {
        const engagement = await Engagement.findById(engagementId);
        if (!engagement) {
            throw new Error('Engagement record not found');
        }

        // Get all engagements for comparison
        const allEngagements = await Engagement.find();
        
        // Calculate industry average
        const industryAverage = allEngagements.reduce((sum, e) => 
            sum + (e.trends?.overallScore || 0), 0) / allEngagements.length;

        // Calculate percentile rank
        const scores = allEngagements.map(e => e.trends?.overallScore || 0).sort((a, b) => a - b);
        const currentScore = engagement.trends?.overallScore || 0;
        const rank = scores.findIndex(score => score >= currentScore);
        const percentileRank = (rank / scores.length) * 100;

        // Calculate category rank
        const categoryRank = scores.length - rank;

        return {
            industryAverage,
            percentileRank,
            categoryRank
        };
    } catch (error) {
        console.error('Error getting performance comparison:', error);
        throw error;
    }
}

module.exports = {
    startEngagementTracking,
    updateEngagementMetrics,
    getTopComments,
    getEngagementHistory,
    getPerformanceComparison
};
