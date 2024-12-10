const { MongoClient } = require('mongodb');

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'linkedin_comments_db';

let dbInstance = null;

async function connectDB() {
    try {
        if (dbInstance) return dbInstance;
        
        const client = await MongoClient.connect(DB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        dbInstance = client.db(DB_NAME);
        console.log('Connected to MongoDB successfully');
        return dbInstance;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

module.exports = { connectDB };
