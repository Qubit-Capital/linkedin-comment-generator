const { connectDB } = require('./config');

class DatabaseOperations {
    constructor() {
        this.db = null;
        this.initialize();
    }

    async initialize() {
        this.db = await connectDB();
    }

    // Post Operations
    async savePost(postData) {
        try {
            const posts = this.db.collection('posts');
            const result = await posts.updateOne(
                { postId: postData.postId },
                { $set: { ...postData, timestamp: new Date() } },
                { upsert: true }
            );
            return result;
        } catch (error) {
            console.error('Error saving post:', error);
            throw error;
        }
    }

    // Comment Operations
    async saveGeneratedComments(postId, comments, userContext) {
        try {
            const commentsCollection = this.db.collection('comments');
            const commentData = {
                postId,
                generatedComments: comments.map(comment => ({
                    ...comment,
                    timestamp: new Date(),
                    isSelected: false
                })),
                userContext,
                metadata: {
                    regenerationCount: 0,
                    generationDuration: 0,
                    errorLogs: []
                }
            };

            const result = await commentsCollection.updateOne(
                { postId },
                { $push: { generatedComments: { $each: commentData.generatedComments } } },
                { upsert: true }
            );
            return result;
        } catch (error) {
            console.error('Error saving generated comments:', error);
            throw error;
        }
    }

    async updateSelectedComment(postId, selectedComment) {
        try {
            const commentsCollection = this.db.collection('comments');
            const result = await commentsCollection.updateOne(
                { postId },
                { 
                    $set: { 
                        selectedComment: {
                            ...selectedComment,
                            timestamp: new Date()
                        }
                    },
                    $inc: { 'metadata.regenerationCount': 1 }
                }
            );
            return result;
        } catch (error) {
            console.error('Error updating selected comment:', error);
            throw error;
        }
    }

    // Analytics Operations
    async updateAnalytics(metrics) {
        try {
            const analytics = this.db.collection('analytics');
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const result = await analytics.updateOne(
                { date: today },
                { 
                    $inc: {
                        'metrics.totalGenerations': 1,
                        'metrics.uniquePosts': 1
                    },
                    $set: {
                        'metrics.averageGenerationTime': metrics.generationTime,
                        'metrics.popularTones': metrics.tones
                    }
                },
                { upsert: true }
            );
            return result;
        } catch (error) {
            console.error('Error updating analytics:', error);
            throw error;
        }
    }

    // Query Operations
    async getPostHistory(postId) {
        try {
            const comments = await this.db.collection('comments')
                .findOne({ postId });
            return comments;
        } catch (error) {
            console.error('Error fetching post history:', error);
            throw error;
        }
    }

    async getAnalyticsSummary(startDate, endDate) {
        try {
            const analytics = await this.db.collection('analytics')
                .find({
                    date: {
                        $gte: startDate,
                        $lte: endDate
                    }
                })
                .toArray();
            return analytics;
        } catch (error) {
            console.error('Error fetching analytics summary:', error);
            throw error;
        }
    }
}

module.exports = new DatabaseOperations();
