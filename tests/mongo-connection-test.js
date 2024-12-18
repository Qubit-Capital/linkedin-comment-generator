const mongoose = require('mongoose');
const { connectDB } = require('../db/config');
const Comment = require('../db/models/Comment');

async function testMongoConnection() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await connectDB();
        console.log('✅ Connected successfully!\n');

        // Sample post data
        const samplePost = {
            postId: `sample-post-${Date.now()}`,
            postContent: "Just launched our new AI feature! #Innovation #Tech",
            postMetadata: {
                authorName: "Sarah Johnson",
                authorId: "sarah-j-123",
                postUrl: "https://linkedin.com/posts/sample",
                timestamp: new Date(),
                engagement: {
                    likes: 150,
                    comments: 45,
                    shares: 20
                }
            },
            generatedComments: [{
                text: "Impressive innovation! The integration of AI in your product shows great foresight.",
                tone: "professional",
                timestamp: new Date(),
                isSelected: false,
                aiMetadata: {
                    model: "gpt-4",
                    confidence: 0.95,
                    generationTime: 800
                }
            }],
            userContext: {
                preferredTone: "professional",
                customInstructions: "Focus on innovation and technology impact",
                templates: ["Great work on #Innovation!", "Exciting #Tech development!"]
            },
            analytics: {
                regenerationCount: 0,
                totalGenerationTime: 800,
                selectedCommentIndex: 0
            }
        };

        // Create the sample post
        console.log('📝 Creating sample post...');
        const newPost = new Comment(samplePost);
        await newPost.save();
        console.log('✅ Sample post created successfully!');

        // Retrieve and verify the created post
        console.log('\n🔍 Retrieving created post...');
        const retrievedPost = await Comment.findOne({ postId: samplePost.postId });
        
        console.log('\n📊 Retrieved Data:');
        console.log('Post ID:', retrievedPost.postId);
        console.log('Author:', retrievedPost.postMetadata.authorName);
        console.log('Content:', retrievedPost.postContent);
        console.log('Generated Comment:', retrievedPost.generatedComments[0].text);
        console.log('Engagement Metrics:', retrievedPost.postMetadata.engagement);
        
        // Test updating the post
        console.log('\n🔄 Testing update operation...');
        const updateResult = await Comment.updateOne(
            { postId: samplePost.postId },
            { 
                $push: { 
                    generatedComments: {
                        text: "The future of tech looks promising with such innovations!",
                        tone: "enthusiastic",
                        timestamp: new Date(),
                        isSelected: false,
                        aiMetadata: {
                            model: "gpt-4",
                            confidence: 0.92,
                            generationTime: 750
                        }
                    }
                },
                $inc: { 'analytics.regenerationCount': 1 }
            }
        );
        console.log('✅ Update operation successful:', updateResult.modifiedCount === 1);

        // Verify the update
        const updatedPost = await Comment.findOne({ postId: samplePost.postId });
        console.log('\n📊 Updated Post Data:');
        console.log('Total Comments:', updatedPost.generatedComments.length);
        console.log('Regeneration Count:', updatedPost.analytics.regenerationCount);
        console.log('\n🔍 You can now view this data in MongoDB Atlas:');
        console.log('Post ID to search:', samplePost.postId);
        console.log('Author Name:', samplePost.postMetadata.authorName);
        console.log('\n✨ Data has been preserved for manual inspection');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.stack) {
            console.error('\nStack trace:', error.stack);
        }
    } finally {
        // Close the connection
        try {
            await mongoose.connection.close();
            console.log('\n👋 MongoDB connection closed.');
        } catch (err) {
            console.error('Error closing connection:', err);
        }
    }
}

// Run the test
console.log('🚀 Starting MongoDB connection test...\n');
testMongoConnection();
