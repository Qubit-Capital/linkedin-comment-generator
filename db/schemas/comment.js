const { Schema } = require('mongoose');

const commentSchema = new Schema({
    postId: {
        type: String,
        required: true,
        index: true
    },
    postContent: {
        type: String,
        required: true
    },
    postMetadata: {
        authorName: String,
        authorId: String,
        postUrl: String,
        timestamp: Date,
        engagement: {
            likes: Number,
            comments: Number,
            shares: Number
        }
    },
    generatedComments: [{
        text: {
            type: String,
            required: true
        },
        tone: {
            type: String,
            enum: ['professional', 'casual', 'enthusiastic', 'thoughtful', 'supportive'],
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        isSelected: {
            type: Boolean,
            default: false
        },
        aiMetadata: {
            model: String,
            confidence: Number,
            generationTime: Number
        }
    }],
    userContext: {
        preferredTone: String,
        customInstructions: String,
        templates: [String]
    },
    analytics: {
        regenerationCount: {
            type: Number,
            default: 0
        },
        totalGenerationTime: {
            type: Number,
            default: 0
        },
        selectedCommentIndex: Number,
        errorLogs: [{
            message: String,
            timestamp: {
                type: Date,
                default: Date.now
            }
        }]
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for better query performance
commentSchema.index({ 'postMetadata.authorId': 1 });
commentSchema.index({ createdAt: -1 });
commentSchema.index({ 'generatedComments.tone': 1 });

// Update the updatedAt timestamp before saving
commentSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = commentSchema;
