const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
    startEngagementTracking,
    updateEngagementMetrics,
    getTopComments,
    getEngagementHistory,
    getPerformanceComparison
} = require('../db/engagement-operations');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Engagement Operations', () => {
    let engagementId;

    const sampleComment = {
        postId: 'post123',
        text: 'Great insights on AI development!',
        metrics: {
            likes: 10,
            replies: 5,
            lastChecked: new Date()
        }
    };

    test('should start engagement tracking', async () => {
        const postUrl = 'https://linkedin.com/post/123';
        const engagement = await startEngagementTracking(sampleComment, postUrl);
        
        expect(engagement).toBeDefined();
        expect(engagement.postMeta.postId).toBe(sampleComment.postId);
        expect(engagement.postMeta.postUrl).toBe(postUrl);
        expect(engagement.activeComment.text).toBe(sampleComment.text);
        
        engagementId = engagement._id;
    });

    test('should update engagement metrics', async () => {
        const newMetrics = {
            likes: 15,
            replies: 8,
            clickThroughRate: 0.05,
            conversionRate: 0.02,
            responseTime: 30
        };

        const updatedEngagement = await updateEngagementMetrics(engagementId, newMetrics);
        
        expect(updatedEngagement).toBeDefined();
        expect(updatedEngagement.activeComment.metrics.likes).toBe(newMetrics.likes);
        expect(updatedEngagement.activeComment.metrics.replies).toBe(newMetrics.replies);
        expect(updatedEngagement.metricsHistory).toHaveLength(1);
    });

    test('should get top comments', async () => {
        // Create a few more engagements for comparison
        const comments = [
            { ...sampleComment, text: 'Comment 1', metrics: { likes: 20, replies: 10 } },
            { ...sampleComment, text: 'Comment 2', metrics: { likes: 5, replies: 2 } },
            { ...sampleComment, text: 'Comment 3', metrics: { likes: 30, replies: 15 } }
        ];

        for (const comment of comments) {
            await startEngagementTracking(comment, 'https://linkedin.com/post/test');
        }

        const topComments = await getTopComments(2);
        expect(topComments).toHaveLength(2);
        expect(topComments[0].metrics.likes).toBeGreaterThanOrEqual(topComments[1].metrics.likes);
    });

    test('should get engagement history', async () => {
        const history = await getEngagementHistory(engagementId);
        
        expect(history).toBeDefined();
        expect(history.historyEntries).toBeGreaterThan(0);
        expect(history.trends).toBeDefined();
        expect(history.insights).toBeDefined();
    });

    test('should get performance comparison', async () => {
        const comparison = await getPerformanceComparison(engagementId);
        
        expect(comparison).toBeDefined();
        expect(comparison.industryAverage).toBeDefined();
        expect(comparison.percentileRank).toBeDefined();
        expect(comparison.categoryRank).toBeDefined();
        expect(comparison.percentileRank).toBeGreaterThanOrEqual(0);
        expect(comparison.percentileRank).toBeLessThanOrEqual(100);
    });
});
