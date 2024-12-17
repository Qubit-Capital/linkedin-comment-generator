const { connectDB } = require('./db/config');
const { checkEngagement } = require('./db/engagement-operations');

// Check if this is the first run of the day
let lastRunDate = null;

async function scheduleEngagementCheck() {
    try {
        // Connect to database if not already connected
        await connectDB();

        // Get current date
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];

        // Check if we already ran today
        if (lastRunDate === currentDate) {
            console.log('Already checked engagement today, skipping...');
            return;
        }

        console.log('Starting scheduled engagement check...');
        const topComments = await checkEngagement();
        console.log('Top performing comments:', topComments);

        // Update last run date
        lastRunDate = currentDate;

    } catch (error) {
        console.error('Error in scheduled engagement check:', error);
    }
}

// Schedule the check to run every 2 days
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
setInterval(scheduleEngagementCheck, TWO_DAYS_MS);

// Run immediately on startup
scheduleEngagementCheck();
