const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./db/config');
const {
    startEngagementTracking,
    updateEngagementMetrics,
    getTopComments,
    checkEngagement,
    stopEngagementTracking,
    getEngagementHistory
} = require('./db/engagement-operations');

async function testEngagement() {
    try {
        console.log('Starting engagement tracking test...');

        // Connect to database
        await connectDB();
        console.log('Connected to database');

        // 1. Test startEngagementTracking
        console.log('\n1. Testing startEngagementTracking...');
        const testComment = {
            _id: new mongoose.Types.ObjectId(),
            text: 'Test comment for engagement tracking',
            postId: 'test-post-123',
            postUrl: 'https://linkedin.com/post/test123',
            metrics: {
                likes: 0,
                replies: 0,
                lastChecked: new Date()
            }
        };

        const tracking = await startEngagementTracking(testComment, testComment.postUrl);
        console.log('Started tracking:', tracking);

        // 2. Test updateEngagementMetrics
        console.log('\n2. Testing updateEngagementMetrics...');
        const updatedMetrics = {
            likes: 10,
            replies: 5,
            clickThroughRate: 0.15,
            conversionRate: 0.05,
            responseTime: 120
        };

        const result = await updateEngagementMetrics(tracking._id, updatedMetrics);
        console.log('Updated metrics:', result);

        // Test 3: Create more test engagements
        console.log('\n3. Creating additional test engagements...');
        for (let i = 0; i < 5; i++) {
            const testComment = {
                _id: new mongoose.Types.ObjectId(),
                postId: `test-post-${i}`,
                generatedComments: [{
                    text: `Test comment ${i}`,
                    isSelected: true
                }]
            };
            const testEngagement = await startEngagementTracking(testComment, `https://linkedin.com/post/test${i}`);
            await updateEngagementMetrics(testEngagement._id, {
                likes: Math.floor(Math.random() * 20),
                replies: Math.floor(Math.random() * 10)
            });
        }

        // Test 4: Get top comments
        console.log('\n4. Testing getTopComments...');
        const topComments = await getTopComments(3);
        console.log('Top 3 comments:', topComments.map(c => ({
            commentText: c.commentText,
            likes: c.metrics.likes,
            replies: c.metrics.replies
        })));

        // Test 5: Check engagement
        console.log('\n5. Testing checkEngagement...');
        const checkedComments = await checkEngagement();
        console.log('Checked engagement for comments:', checkedComments.length);

        // Test 6: Get engagement history
        console.log('\n6. Testing getEngagementHistory...');
        const history = await getEngagementHistory(tracking._id);
        console.log('Engagement history entries:', history.length);

        // Test 7: Stop tracking
        console.log('\n7. Testing stopEngagementTracking...');
        const stoppedEngagement = await stopEngagementTracking(tracking._id);
        console.log('Stopped tracking:', {
            commentId: stoppedEngagement.commentId,
            isActive: stoppedEngagement.isActive
        });

        console.log('\nAll engagement tests completed successfully!');

    } catch (error) {
        console.error('Error during engagement testing:', error);
    } finally {
        // Close the MongoDB connection
        await disconnectDB();
        console.log('Database connection closed');
        process.exit(0);
    }
}

// Run the tests
testEngagement();
