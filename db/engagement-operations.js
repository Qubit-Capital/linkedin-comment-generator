const Engagement = require('./models/Engagement');
const Comment = require('./models/Comment');

/**
 * Start tracking engagement for a comment
 */
async function startEngagementTracking(comment, postUrl) {
    try {
        // Get selected comment
        const selectedComment = comment.generatedComments.find(c => c.isSelected) || comment.generatedComments[0];
        
        const engagement = new Engagement({
            postMeta: {
                postId: comment.postId,
                postUrl: postUrl,
                postContent: comment.postContent,
                authorName: comment.postMetadata?.authorName,
                authorId: comment.postMetadata?.authorId,
                postDate: comment.postMetadata?.timestamp,
                postEngagement: comment.postMetadata?.engagement
            },
            generatedComments: comment.generatedComments.map(c => ({
                text: c.text,
                tone: c.tone,
                timestamp: c.timestamp,
                model: c.aiMetadata?.model,
                confidence: c.aiMetadata?.confidence,
                isSelected: c.isSelected,
                isPosted: false
            })),
            activeComment: {
                text: selectedComment.text,
                selectionDate: selectedComment.timestamp,
                postDate: new Date(),
                isRegenerated: false,
                metrics: {
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

        // Calculate trends and performance
        engagement.calculateTrend();
        engagement.calculatePerformanceScore();

        // Generate insights
        generateInsights(engagement);

        engagement.status.lastUpdated = new Date();
        await engagement.save();
        return engagement;
    } catch (error) {
        console.error('Error updating engagement metrics:', error);
        throw error;
    }
}

/**
 * Generate insights based on performance metrics
 */
function generateInsights(engagement) {
    const latest = engagement.metricsHistory[engagement.metricsHistory.length - 1];
    const trend = engagement.performance.trend;

    // Growth rate insights
    if (trend.likesGrowthRate > 0.5) {
        engagement.addInsight('growth', 'High engagement growth rate detected', {
            growthRate: trend.likesGrowthRate
        });
    }

    // Performance insights
    if (engagement.performance.trend.overallScore > 8) {
        engagement.addInsight('performance', 'Comment is performing exceptionally well', {
            score: engagement.performance.trend.overallScore
        });
    }

    // Engagement pattern insights
    if (latest.engagement.responseTime < 2) {
        engagement.addInsight('engagement', 'Quick response time indicates high relevance', {
            responseTime: latest.engagement.responseTime
        });
    }
}

/**
 * Get top performing comments with detailed analysis
 */
async function getTopComments(limit = 5) {
    try {
        return await Engagement.find({ 'status.isActive': true })
            .sort({ 'performance.trend.overallScore': -1 })
            .limit(limit);
    } catch (error) {
        console.error('Error getting top comments:', error);
        throw error;
    }
}

/**
 * Check and update engagement for all active tracked comments
 */
async function checkEngagement() {
    try {
        const activeEngagements = await Engagement.find({ 'status.isActive': true });
        console.log(`Checking engagement for ${activeEngagements.length} comments`);

        for (const engagement of activeEngagements) {
            try {
                // Here you would typically make a request to LinkedIn to get current metrics
                // For now, we'll simulate this with random increases
                const currentMetrics = engagement.activeComment.metrics;
                const newMetrics = {
                    likes: currentMetrics.likes + Math.floor(Math.random() * 5),
                    replies: currentMetrics.replies + Math.floor(Math.random() * 2),
                    clickThroughRate: Math.random() * 0.1,
                    conversionRate: Math.random() * 0.05,
                    responseTime: Math.random() * 5
                };

                await updateEngagementMetrics(engagement._id, newMetrics);
                console.log(`Updated metrics for comment ${engagement._id}`);
            } catch (error) {
                console.error(`Error updating engagement for comment ${engagement._id}:`, error);
                continue;
            }
        }

        // Update rankings
        const topComments = await getTopComments();
        for (let i = 0; i < topComments.length; i++) {
            topComments[i].status.rank = i + 1;
            await topComments[i].save();
        }

        return topComments;
    } catch (error) {
        console.error('Error in engagement check:', error);
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
            history: engagement.metricsHistory,
            trends: engagement.performance.trend,
            insights: engagement.performance.insights
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

        // Get all scores
        const allEngagements = await Engagement.find({}, 'performance.trend.overallScore');
        const scores = allEngagements
            .map(e => e.performance?.trend?.overallScore)
            .filter(score => typeof score === 'number' && !isNaN(score));
        
        if (scores.length === 0) {
            engagement.performance.comparison = {
                industryAverage: 0,
                percentileRank: 100,
                categoryRank: 1
            };
        } else {
            const totalComments = scores.length;
            const currentScore = engagement.performance.trend.overallScore || 0;
            const industryAverage = scores.reduce((sum, score) => sum + score, 0) / totalComments;
            
            // Sort scores in ascending order
            scores.sort((a, b) => a - b);
            const rank = scores.findIndex(score => score >= currentScore);
            const actualRank = rank === -1 ? totalComments : rank;
            
            engagement.performance.comparison = {
                industryAverage: industryAverage,
                percentileRank: ((totalComments - actualRank) / totalComments) * 100,
                categoryRank: actualRank + 1
            };
        }

        await engagement.save();
        return engagement.performance.comparison;
    } catch (error) {
        console.error('Error getting performance comparison:', error);
        throw error;
    }
}

module.exports = {
    startEngagementTracking,
    updateEngagementMetrics,
    getTopComments,
    checkEngagement,
    getEngagementHistory,
    getPerformanceComparison
};
