const mongoose = require('mongoose');
const {
    createComment,
    addGeneratedComment,
    selectComment,
    getComments,
    getUserHistory,
    logError,
    updateUserContext
} = require('./db/operations');

async function testDatabaseOperations() {
    try {
        console.log('Starting database operations test...');

        // Test 1: Create a new comment
        console.log('\n1. Testing createComment...');
        const postData = {
            postId: 'test-post-123',
            content: 'This is a test LinkedIn post about AI and machine learning.',
            authorName: 'Test User',
            authorId: 'test-user-456',
            url: 'https://linkedin.com/post/test123',
            engagement: {
                likes: 100,
                comments: 25,
                shares: 10
            },
            userContext: {
                preferredTone: 'professional',
                customInstructions: 'Focus on AI and tech'
            }
        };

        const generatedComment = {
            text: 'Fascinating insights about AI! The future of machine learning is indeed promising.',
            tone: 'enthusiastic',
            model: 'gpt-3.5-turbo',
            confidence: 0.95,
            generationTime: 1.2
        };

        const newComment = await createComment(postData, generatedComment);
        console.log('Created comment:', newComment);

        // Test 2: Add another generated comment
        console.log('\n2. Testing addGeneratedComment...');
        const additionalComment = {
            text: 'Great points about machine learning! Would love to discuss more.',
            tone: 'professional',
            model: 'gpt-3.5-turbo',
            confidence: 0.92,
            generationTime: 1.1
        };

        const updatedComment = await addGeneratedComment(postData.postId, additionalComment);
        console.log('Added new comment:', updatedComment.generatedComments[updatedComment.generatedComments.length - 1]);

        // Test 3: Select a specific comment
        console.log('\n3. Testing selectComment...');
        const selectedComment = await selectComment(postData.postId, 1);
        console.log('Selected comment index:', selectedComment.analytics.selectedCommentIndex);

        // Test 4: Get all comments for the post
        console.log('\n4. Testing getComments...');
        const allComments = await getComments(postData.postId);
        console.log('Retrieved comments count:', allComments.generatedComments.length);

        // Test 5: Get user history
        console.log('\n5. Testing getUserHistory...');
        const userHistory = await getUserHistory(postData.authorId);
        console.log('User history count:', userHistory.length);

        // Test 6: Log an error
        console.log('\n6. Testing logError...');
        const errorLogged = await logError(postData.postId, 'Test error message');
        console.log('Error logs count:', errorLogged.analytics.errorLogs.length);

        // Test 7: Update user context
        console.log('\n7. Testing updateUserContext...');
        const newContext = {
            preferredTone: 'casual',
            customInstructions: 'Updated instructions'
        };
        const updatedContext = await updateUserContext(postData.postId, newContext);
        console.log('Updated user context:', updatedContext.userContext);

        console.log('\nAll tests completed successfully!');

    } catch (error) {
        console.error('Error during testing:', error);
    } finally {
        // Close the MongoDB connection
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
}

// Run the tests
testDatabaseOperations();
