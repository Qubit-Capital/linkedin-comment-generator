const mongoose = require('mongoose');
const { connectDB } = require('./db/config');
const {
    recordCommentGeneration,
    recordError,
    getAnalytics,
    getTodayAnalytics
} = require('./db/analytics-operations');

async function testAnalytics() {
    try {
        console.log('Starting analytics testing...');
        
        // Connect to database first
        await connectDB();
        console.log('Connected to database');

        // Test 1: Record a comment generation
        console.log('\n1. Testing recordCommentGeneration...');
        const generationResult = await recordCommentGeneration({
            userId: 'test-user-123',
            postId: 'test-post-456',
            tone: 'professional',
            modelVersion: 'gpt-3.5-turbo',
            generationTime: 1.5,
            confidence: 0.95,
            hasError: false
        });
        console.log('Generation recorded:', {
            totalGenerations: generationResult.generationMetrics.totalGenerations,
            toneDistribution: generationResult.generationMetrics.toneDistribution,
            modelMetrics: generationResult.modelMetrics
        });

        // Test 2: Record another generation with different tone
        console.log('\n2. Testing recordCommentGeneration with different tone...');
        const generation2Result = await recordCommentGeneration({
            userId: 'test-user-124',
            postId: 'test-post-457',
            tone: 'casual',
            modelVersion: 'gpt-3.5-turbo',
            generationTime: 1.2,
            confidence: 0.92,
            hasError: false
        });
        console.log('Second generation recorded:', {
            totalGenerations: generation2Result.generationMetrics.totalGenerations,
            toneDistribution: generation2Result.generationMetrics.toneDistribution
        });

        // Test 3: Record an error
        console.log('\n3. Testing recordError...');
        const errorResult = await recordError('API_TIMEOUT');
        console.log('Error recorded:', {
            errors: errorResult.errors,
            successRate: errorResult.generationMetrics.successRate
        });

        // Test 4: Get today's analytics
        console.log('\n4. Testing getTodayAnalytics...');
        const todayStats = await getTodayAnalytics();
        console.log('Today\'s analytics:', {
            totalGenerations: todayStats.generationMetrics.totalGenerations,
            successRate: todayStats.generationMetrics.successRate,
            hourlyDistribution: todayStats.hourlyDistribution
        });

        // Test 5: Get date range analytics
        console.log('\n5. Testing getAnalytics for date range...');
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // Last 7 days
        const rangeStats = await getAnalytics(startDate, endDate);
        console.log('Date range analytics count:', rangeStats.length);

        console.log('\nAll analytics tests completed successfully!');

    } catch (error) {
        console.error('Error during analytics testing:', error);
    } finally {
        // Close the MongoDB connection
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
}

// Run the tests
testAnalytics();
