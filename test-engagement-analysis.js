const mongoose = require('mongoose');
const { connectDB } = require('./db/config');
const {
    startEngagementTracking,
    updateEngagementMetrics,
    getTopComments,
    checkEngagement,
    getEngagementHistory,
    getPerformanceComparison
} = require('./db/engagement-operations');

async function testEngagementAnalysis() {
    try {
        console.log('Starting engagement analysis testing...');

        // Connect to database
        await connectDB();
        console.log('Connected to database');

        // Test 1: Create test comments with full metadata
        console.log('\n1. Creating test comments with full metadata...');
        const mockComment = {
            postId: 'test-post-123',
            postContent: 'This is a test LinkedIn post about AI and machine learning.',
            postMetadata: {
                authorName: 'Test User',
                authorId: 'test-user-456',
                timestamp: new Date(),
                engagement: {
                    likes: 100,
                    comments: 25,
                    shares: 10
                }
            },
            generatedComments: [
                {
                    text: 'Great insights about AI! Would love to discuss more.',
                    tone: 'professional',
                    timestamp: new Date(),
                    aiMetadata: {
                        model: 'gpt-3.5-turbo',
                        confidence: 0.95
                    },
                    isSelected: true
                },
                {
                    text: 'Fascinating perspective on machine learning!',
                    tone: 'enthusiastic',
                    timestamp: new Date(),
                    aiMetadata: {
                        model: 'gpt-3.5-turbo',
                        confidence: 0.92
                    },
                    isSelected: false
                }
            ]
        };

        const engagement = await startEngagementTracking(mockComment, 'https://linkedin.com/post/test123');
        console.log('Created engagement tracking:', {
            postMeta: engagement.postMeta,
            activeComment: engagement.activeComment.text,
            trackingPeriod: engagement.trackingPeriod
        });

        // Test 2: Update metrics with engagement data
        console.log('\n2. Testing metrics update with engagement data...');
        const updatedEngagement = await updateEngagementMetrics(engagement._id, {
            likes: 15,
            replies: 7,
            clickThroughRate: 0.08,
            conversionRate: 0.03,
            responseTime: 1.5
        });
        console.log('Updated metrics:', {
            currentMetrics: updatedEngagement.activeComment.metrics,
            trends: updatedEngagement.performance.trend,
            insights: updatedEngagement.performance.insights
        });

        // Test 3: Create more test engagements for comparison
        console.log('\n3. Creating additional test engagements...');
        for (let i = 0; i < 5; i++) {
            const testComment = {
                postId: `test-post-${i}`,
                postContent: `Test post ${i}`,
                postMetadata: {
                    authorName: `User ${i}`,
                    authorId: `user-${i}`,
                    timestamp: new Date(),
                    engagement: {
                        likes: Math.floor(Math.random() * 200),
                        comments: Math.floor(Math.random() * 50),
                        shares: Math.floor(Math.random() * 20)
                    }
                },
                generatedComments: [{
                    text: `Test comment ${i}`,
                    tone: 'professional',
                    timestamp: new Date(),
                    aiMetadata: {
                        model: 'gpt-3.5-turbo',
                        confidence: 0.9 + Math.random() * 0.1
                    },
                    isSelected: true
                }]
            };

            const testEngagement = await startEngagementTracking(testComment, `https://linkedin.com/post/test${i}`);
            await updateEngagementMetrics(testEngagement._id, {
                likes: Math.floor(Math.random() * 30),
                replies: Math.floor(Math.random() * 15),
                clickThroughRate: Math.random() * 0.1,
                conversionRate: Math.random() * 0.05,
                responseTime: Math.random() * 5
            });
        }

        // Test 4: Get performance comparison
        console.log('\n4. Testing performance comparison...');
        const comparison = await getPerformanceComparison(engagement._id);
        console.log('Performance comparison:', comparison);

        // Test 5: Get engagement history with trends
        console.log('\n5. Testing engagement history with trends...');
        const history = await getEngagementHistory(engagement._id);
        console.log('Engagement history:', {
            historyEntries: history.history.length,
            trends: history.trends,
            insights: history.insights
        });

        // Test 6: Get top performing comments
        console.log('\n6. Testing top performing comments...');
        const topComments = await getTopComments(3);
        console.log('Top 3 comments:', topComments.map(c => ({
            text: c.activeComment.text,
            metrics: c.activeComment.metrics,
            score: c.performance.trend.overallScore
        })));

        console.log('\nAll engagement analysis tests completed successfully!');

    } catch (error) {
        console.error('Error during engagement analysis testing:', error);
    } finally {
        // Close the MongoDB connection
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
}

// Run the tests
testEngagementAnalysis();
