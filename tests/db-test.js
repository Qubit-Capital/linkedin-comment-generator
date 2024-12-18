const mongoose = require('mongoose');
const { 
    createComment, 
    addGeneratedComment, 
    selectComment, 
    getComments,
    getUserHistory,
    updateUserContext
} = require('../db/operations');
const { connectDB, disconnectDB } = require('../db/config');

async function testDatabaseOperations() {
    try {
        console.log('Starting database operations test...');
        
        // Connect to database with timeout
        await Promise.race([
            connectDB(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database connection timeout after 5s')), 5000)
            )
        ]);

        // Test data
        const postData = {
            postId: 'test-post-' + Date.now(),
            content: 'This is a test LinkedIn post about AI and Machine Learning.',
            authorName: 'Test User',
            authorId: 'test-user-123',
            url: 'https://linkedin.com/post/test',
            engagement: {
                likes: 10,
                comments: 5,
                shares: 2
            },
            userContext: {
                preferredTone: 'professional',
                customInstructions: 'Focus on AI topics',
                templates: ['Great insights about #AI!']
            }
        };

        const generatedComment = {
            text: 'Fascinating insights about AI! The intersection with Machine Learning opens up incredible possibilities.',
            tone: 'professional',
            model: 'gpt-3.5-turbo',
            confidence: 0.92,
            generationTime: 1200 // ms
        };

        // 1. Create initial comment
        console.log('\n1. Creating initial comment...');
        const newComment = await createComment(postData, generatedComment);
        console.log('Initial comment created:', newComment._id);

        // 2. Add another generated comment
        console.log('\n2. Adding another generated comment...');
        const secondComment = {
            text: 'The future of AI is indeed promising. Your points about Machine Learning are spot-on!',
            tone: 'enthusiastic',
            model: 'gpt-3.5-turbo',
            confidence: 0.88,
            generationTime: 1100
        };
        const updatedPost = await addGeneratedComment(postData.postId, secondComment);
        console.log('Second comment added, total comments:', updatedPost.generatedComments.length);

        // 3. Select a comment
        console.log('\n3. Selecting the second comment...');
        const selectedComment = await selectComment(postData.postId, 1);
        console.log('Selected comment:', selectedComment.generatedComments[1].text);

        // 4. Get all comments for the post
        console.log('\n4. Getting all comments for the post...');
        const allComments = await getComments(postData.postId);
        console.log('Total comments found:', allComments.generatedComments.length);

        // 5. Get user history
        console.log('\n5. Getting user history...');
        const userHistory = await getUserHistory(postData.authorId);
        console.log('User history entries:', userHistory.length);

        // 6. Update user context
        console.log('\n6. Updating user context...');
        const newContext = {
            preferredTone: 'casual',
            customInstructions: 'Focus on practical applications',
            templates: ['Great work on #AI!', 'Fascinating application!']
        };
        const updatedContext = await updateUserContext(postData.postId, newContext);
        console.log('Updated user context:', updatedContext.userContext);

        console.log('\nAll tests completed successfully!');
    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    } finally {
        // Cleanup: Close database connection
        try {
            await mongoose.connection.close();
            console.log('\nDatabase connection closed.');
        } catch (err) {
            console.error('Error closing database connection:', err);
        }
        // Exit process after cleanup
        process.exit(0);
    }
}

// Run the tests
console.log('Database test script started');
testDatabaseOperations();
