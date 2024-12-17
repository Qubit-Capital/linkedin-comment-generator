const { Schema } = require('mongoose');

const analyticsSchema = new Schema({
    // Daily metrics
    date: {
        type: Date,
        required: true,
        index: true
    },
    generationMetrics: {
        totalGenerations: {
            type: Number,
            default: 0
        },
        uniquePosts: {
            type: Number,
            default: 0
        },
        uniqueUsers: {
            type: Number,
            default: 0
        },
        averageGenerationTime: {
            type: Number,
            default: 0
        },
        toneDistribution: {
            professional: { type: Number, default: 0 },
            casual: { type: Number, default: 0 },
            enthusiastic: { type: Number, default: 0 },
            thoughtful: { type: Number, default: 0 },
            supportive: { type: Number, default: 0 }
        },
        regenerationRate: {
            type: Number,
            default: 0
        },
        successRate: {
            type: Number,
            default: 100
        }
    },
    // Hourly breakdown for generation load analysis
    hourlyDistribution: [{
        hour: Number,
        count: Number
    }],
    // Model performance metrics
    modelMetrics: {
        averageConfidence: {
            type: Number,
            default: 0
        },
        modelVersions: [{
            version: String,
            usageCount: Number,
            averageLatency: Number,
            errorRate: Number
        }]
    },
    // Error tracking
    errors: [{
        errorType: String,
        count: Number,
        lastOccurred: Date
    }]
});

// Index for efficient date-based queries
analyticsSchema.index({ date: 1 });

// Method to update hourly distribution
analyticsSchema.methods.updateHourlyCount = function(hour) {
    const hourEntry = this.hourlyDistribution.find(h => h.hour === hour);
    if (hourEntry) {
        hourEntry.count += 1;
    } else {
        this.hourlyDistribution.push({ hour, count: 1 });
    }
};

// Method to update tone distribution
analyticsSchema.methods.updateToneCount = function(tone) {
    if (this.generationMetrics.toneDistribution.hasOwnProperty(tone)) {
        this.generationMetrics.toneDistribution[tone] += 1;
    }
};

// Method to update model metrics
analyticsSchema.methods.updateModelMetrics = function(version, latency, confidence, hasError) {
    let modelVersion = this.modelMetrics.modelVersions.find(m => m.version === version);
    
    if (!modelVersion) {
        modelVersion = {
            version,
            usageCount: 0,
            averageLatency: 0,
            errorRate: 0
        };
        this.modelMetrics.modelVersions.push(modelVersion);
    }

    // Update metrics
    const oldCount = modelVersion.usageCount;
    modelVersion.usageCount += 1;
    modelVersion.averageLatency = (modelVersion.averageLatency * oldCount + latency) / modelVersion.usageCount;
    
    if (hasError) {
        modelVersion.errorRate = ((modelVersion.errorRate * oldCount) + 1) / modelVersion.usageCount;
    }

    // Update overall confidence
    this.modelMetrics.averageConfidence = (this.modelMetrics.averageConfidence * oldCount + confidence) / modelVersion.usageCount;
};

// Static method to get analytics for a date range
analyticsSchema.statics.getDateRangeMetrics = async function(startDate, endDate) {
    return await this.find({
        date: {
            $gte: startDate,
            $lte: endDate
        }
    }).sort({ date: 1 });
};

module.exports = analyticsSchema;
