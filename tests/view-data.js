const mongoose = require('mongoose');
const { connectDB } = require('../db/config');
const Comment = require('../db/models/Comment');

async function viewStoredData() {
    try {
        console.log('Connecting to database...');
        await connectDB();
        console.log('Connected successfully!\n');

        // Get all comments with full details
        const comments = await Comment.find({})
            .sort({ createdAt: -1 }) // Latest first
            .lean(); // Convert to plain JavaScript objects

        console.log('=== Stored Comments Data ===\n');
        comments.forEach((comment, index) => {
            console.log(`\n--- Comment Record ${index + 1} ---`);
            console.log('Post ID:', comment.postId);
            console.log('Post Content:', comment.postContent);
            
            console.log('\nPost Metadata:');
            console.log('- Author:', comment.postMetadata.authorName);
            console.log('- URL:', comment.postMetadata.postUrl);
            console.log('- Posted:', new Date(comment.postMetadata.timestamp).toLocaleString());
            console.log('- Engagement:', comment.postMetadata.engagement);

            console.log('\nGenerated Comments:');
            comment.generatedComments.forEach((gen, i) => {
                console.log(`\n  Comment ${i + 1}:`);
                console.log('  - Text:', gen.text);
                console.log('  - Tone:', gen.tone);
                console.log('  - Generated:', new Date(gen.timestamp).toLocaleString());
                console.log('  - Selected:', gen.isSelected);
                if (gen.aiMetadata) {
                    console.log('  - AI Model:', gen.aiMetadata.model);
                    console.log('  - Confidence:', gen.aiMetadata.confidence);
                    console.log('  - Generation Time:', gen.aiMetadata.generationTime, 'ms');
                }
            });

            console.log('\nUser Context:');
            console.log('- Preferred Tone:', comment.userContext.preferredTone);
            console.log('- Custom Instructions:', comment.userContext.customInstructions);
            console.log('- Templates:', comment.userContext.templates);

            console.log('\nAnalytics:');
            console.log('- Regeneration Count:', comment.analytics.regenerationCount);
            console.log('- Total Generation Time:', comment.analytics.totalGenerationTime, 'ms');
            console.log('- Selected Comment Index:', comment.analytics.selectedCommentIndex);
            
            if (comment.analytics.errorLogs && comment.analytics.errorLogs.length > 0) {
                console.log('\nError Logs:');
                comment.analytics.errorLogs.forEach((log, i) => {
                    console.log(`  Error ${i + 1}:`);
                    console.log('  - Message:', log.message);
                    console.log('  - Time:', new Date(log.timestamp).toLocaleString());
                });
            }

            console.log('\nTimestamps:');
            console.log('- Created:', new Date(comment.createdAt).toLocaleString());
            console.log('- Last Updated:', new Date(comment.updatedAt).toLocaleString());
            console.log('\n' + '='.repeat(50));
        });

        console.log('\nTotal Records:', comments.length);
    } catch (error) {
        console.error('Error viewing data:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    }
}

// Run the viewer
console.log('Starting data viewer...');
viewStoredData();
