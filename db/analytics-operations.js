const Analytics = require('./models/Analytics');

// Helper function to get today's date with time set to midnight
const getTodayDate = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

// Helper function to get current hour
const getCurrentHour = () => {
    return new Date().getHours();
};

/**
 * Record a new comment generation event
 */
async function recordCommentGeneration(params) {
    const {
        userId,
        postId,
        tone,
        modelVersion,
        generationTime,
        confidence,
        hasError
    } = params;

    const today = getTodayDate();
    const currentHour = getCurrentHour();

    try {
        let dailyAnalytics = await Analytics.findOne({ date: today });

        if (!dailyAnalytics) {
            dailyAnalytics = new Analytics({
                date: today,
                hourlyDistribution: []
            });
        }

        // Update basic metrics
        dailyAnalytics.generationMetrics.totalGenerations += 1;
        
        // Update hourly distribution
        dailyAnalytics.updateHourlyCount(currentHour);
        
        // Update tone distribution
        dailyAnalytics.updateToneCount(tone);
        
        // Update model metrics
        dailyAnalytics.updateModelMetrics(
            modelVersion,
            generationTime,
            confidence,
            hasError
        );

        // Calculate success rate
        if (hasError) {
            const total = dailyAnalytics.generationMetrics.totalGenerations;
            const errorCount = dailyAnalytics.errors.reduce((sum, err) => sum + err.count, 0);
            dailyAnalytics.generationMetrics.successRate = ((total - errorCount) / total) * 100;
        }

        await dailyAnalytics.save();
        return dailyAnalytics;
    } catch (error) {
        console.error('Error recording comment generation:', error);
        throw error;
    }
}

/**
 * Record an error event
 */
async function recordError(errorType) {
    const today = getTodayDate();

    try {
        let dailyAnalytics = await Analytics.findOne({ date: today });

        if (!dailyAnalytics) {
            dailyAnalytics = new Analytics({
                date: today,
                hourlyDistribution: []
            });
        }

        // Update error tracking
        const existingError = dailyAnalytics.errors.find(e => e.errorType === errorType);
        if (existingError) {
            existingError.count += 1;
            existingError.lastOccurred = new Date();
        } else {
            dailyAnalytics.errors.push({
                errorType,
                count: 1,
                lastOccurred: new Date()
            });
        }

        // Update success rate
        const total = dailyAnalytics.generationMetrics.totalGenerations;
        const errorCount = dailyAnalytics.errors.reduce((sum, err) => sum + err.count, 0);
        dailyAnalytics.generationMetrics.successRate = ((total - errorCount) / total) * 100;

        await dailyAnalytics.save();
        return dailyAnalytics;
    } catch (error) {
        console.error('Error recording error event:', error);
        throw error;
    }
}

/**
 * Get analytics for a specific date range
 */
async function getAnalytics(startDate, endDate) {
    try {
        return await Analytics.getDateRangeMetrics(startDate, endDate);
    } catch (error) {
        console.error('Error getting analytics:', error);
        throw error;
    }
}

/**
 * Get today's analytics
 */
async function getTodayAnalytics() {
    const today = getTodayDate();
    try {
        return await Analytics.findOne({ date: today });
    } catch (error) {
        console.error('Error getting today\'s analytics:', error);
        throw error;
    }
}

module.exports = {
    recordCommentGeneration,
    recordError,
    getAnalytics,
    getTodayAnalytics
};
