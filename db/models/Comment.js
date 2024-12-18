const mongoose = require('mongoose');
const commentSchema = require('../schemas/comment');

// Use the simple collection name 'comments' since database is already specified in connection string
const Comment = mongoose.model('Comment', commentSchema, 'comments');

module.exports = Comment;
