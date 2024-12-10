// Schema definitions for MongoDB collections

const postSchema = {
    postId: String,           // Unique identifier for the post
    postContent: String,      // The actual post text
    postUrl: String,         // URL of the post
    authorId: String,        // LinkedIn ID of post author
    authorName: String,      // Name of post author
    timestamp: Date,         // When the post was processed
    metadata: {              // Additional post metadata
        likes: Number,
        comments: Number,
        shares: Number
    }
};

const commentSchema = {
    postId: String,          // Reference to the post
    generatedComments: [{    // Array of generated comments
        text: String,        // Comment text
        tone: String,        // Comment tone
        timestamp: Date,     // When comment was generated
        isSelected: Boolean, // Whether this comment was selected
        apiResponse: Object  // Raw API response for reference
    }],
    selectedComment: {       // The comment that was actually used
        text: String,
        tone: String,
        timestamp: Date
    },
    userContext: {           // Context used for generation
        preferredTone: String,
        customInstructions: String,
        templates: [String]
    },
    metadata: {              // Additional tracking data
        regenerationCount: Number,
        generationDuration: Number,
        errorLogs: [String]
    }
};

const analyticsSchema = {
    date: Date,              // Date of analytics record
    metrics: {
        totalGenerations: Number,
        uniquePosts: Number,
        regenerationRate: Number,
        averageGenerationTime: Number,
        popularTones: Object,
        errorRates: Object
    },
    userMetrics: {
        activeUsers: Number,
        averageCommentsPerUser: Number,
        tonePreferences: Object
    }
};

module.exports = {
    postSchema,
    commentSchema,
    analyticsSchema
};
