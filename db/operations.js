const Comment = require('./models/Comment');
const { connectDB } = require('./config');

// Initialize database connection
connectDB().catch(console.error);

// Create a new comment entry
async function createComment(postData, generatedComment) {
    try {
        const comment = new Comment({
            postId: postData.postId,
            postContent: postData.content,
            postMetadata: {
                authorName: postData.authorName,
                authorId: postData.authorId,
                postUrl: postData.url,
                timestamp: new Date(),
                engagement: {
                    likes: postData.engagement?.likes || 0,
                    comments: postData.engagement?.comments || 0,
                    shares: postData.engagement?.shares || 0
                }
            },
            generatedComments: [{
                text: generatedComment.text,
                tone: generatedComment.tone,
                timestamp: new Date(),
                isSelected: false,
                aiMetadata: {
                    model: generatedComment.model || 'gpt-3.5-turbo',
                    confidence: generatedComment.confidence,
                    generationTime: generatedComment.generationTime
                }
            }],
            userContext: {
                preferredTone: postData.userContext?.preferredTone,
                customInstructions: postData.userContext?.customInstructions,
                templates: postData.userContext?.templates || []
            }
        });

        await comment.save();
        return comment;
    } catch (error) {
        console.error('Error creating comment:', error);
        throw error;
    }
}

// Add a new generated comment to an existing post
async function addGeneratedComment(postId, generatedComment) {
    try {
        const comment = await Comment.findOne({ postId });
        if (!comment) {
            throw new Error('Post not found');
        }

        comment.generatedComments.push({
            text: generatedComment.text,
            tone: generatedComment.tone,
            timestamp: new Date(),
            isSelected: false,
            aiMetadata: {
                model: generatedComment.model || 'gpt-3.5-turbo',
                confidence: generatedComment.confidence,
                generationTime: generatedComment.generationTime
            }
        });

        comment.analytics.regenerationCount += 1;
        comment.analytics.totalGenerationTime += generatedComment.generationTime || 0;

        await comment.save();
        return comment;
    } catch (error) {
        console.error('Error adding generated comment:', error);
        throw error;
    }
}

// Select a specific comment as the chosen one
async function selectComment(postId, commentIndex) {
    try {
        const comment = await Comment.findOne({ postId });
        if (!comment) {
            throw new Error('Post not found');
        }

        // Reset all comments to unselected
        comment.generatedComments.forEach(c => c.isSelected = false);

        // Select the specified comment
        if (comment.generatedComments[commentIndex]) {
            comment.generatedComments[commentIndex].isSelected = true;
            comment.analytics.selectedCommentIndex = commentIndex;
        } else {
            throw new Error('Comment index out of range');
        }

        await comment.save();
        return comment;
    } catch (error) {
        console.error('Error selecting comment:', error);
        throw error;
    }
}

// Get all comments for a post
async function getComments(postId) {
    try {
        return await Comment.findOne({ postId });
    } catch (error) {
        console.error('Error getting comments:', error);
        throw error;
    }
}

// Get user's comment history
async function getUserHistory(authorId, limit = 10) {
    try {
        return await Comment.find({ 'postMetadata.authorId': authorId })
            .sort({ createdAt: -1 })
            .limit(limit);
    } catch (error) {
        console.error('Error getting user history:', error);
        throw error;
    }
}

// Log an error for a post
async function logError(postId, errorMessage) {
    try {
        const comment = await Comment.findOne({ postId });
        if (!comment) {
            throw new Error('Post not found');
        }

        comment.analytics.errorLogs.push({
            message: errorMessage,
            timestamp: new Date()
        });

        await comment.save();
        return comment;
    } catch (error) {
        console.error('Error logging error:', error);
        throw error;
    }
}

// Update user context for a post
async function updateUserContext(postId, userContext) {
    try {
        const comment = await Comment.findOne({ postId });
        if (!comment) {
            throw new Error('Post not found');
        }

        comment.userContext = {
            ...comment.userContext,
            ...userContext
        };

        await comment.save();
        return comment;
    } catch (error) {
        console.error('Error updating user context:', error);
        throw error;
    }
}

module.exports = {
    createComment,
    addGeneratedComment,
    selectComment,
    getComments,
    getUserHistory,
    logError,
    updateUserContext
};
