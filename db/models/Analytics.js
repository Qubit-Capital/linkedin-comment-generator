const mongoose = require('mongoose');
const analyticsSchema = require('../schemas/analytics');

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;
