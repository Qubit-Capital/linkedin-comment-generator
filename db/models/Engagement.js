const mongoose = require('mongoose');
const engagementSchema = require('../schemas/engagement');

const Engagement = mongoose.model('Engagement', engagementSchema);

module.exports = Engagement;
