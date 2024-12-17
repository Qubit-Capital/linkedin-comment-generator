const mongoose = require('mongoose');
const Comment = require('./db/models/Comment');

const uri = "mongodb+srv://malaygupta:3VXz24KhjZJEbX55@linkedin-comment-genera.oq68x.mongodb.net/?retryWrites=true&w=majority&appName=linkedin-comment-generator";

async function testSchema() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Create a test comment
        const testComment = new Comment({
            postId: 'test-post-123',
            postContent: 'This is a test LinkedIn post about AI and technology.',
            postMetadata: {
                authorName: 'John Doe',
                authorId: 'john-doe-123',
                postUrl: 'https://linkedin.com/post/123',
                timestamp: new Date(),
                engagement: {
                    likes: 100,
                    comments: 50,
                    shares: 25
                }
            },
            generatedComments: [{
                text: 'Great insights about AI! The future is exciting.',
                tone: 'enthusiastic',
                aiMetadata: {
                    model: 'gpt-4',
                    confidence: 0.95,
                    generationTime: 1.2
                }
            }],
            userContext: {
                preferredTone: 'professional',
                customInstructions: 'Focus on AI and tech topics'
            }
        });

        // Save the comment
        await testComment.save();
        console.log('Test comment saved successfully');

        // Retrieve and verify
        const savedComment = await Comment.findOne({ postId: 'test-post-123' });
        console.log('Retrieved comment:', savedComment.postContent);

        // Clean up test data
        await Comment.deleteOne({ postId: 'test-post-123' });
        console.log('Test data cleaned up');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

testSchema();
