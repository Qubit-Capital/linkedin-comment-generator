const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://malaygupta:3VXz24KhjZJEbX55@linkedin-comment-genera.oq68x.mongodb.net/?retryWrites=true&w=majority&appName=linkedin-comment-generator";

let connection = null;

async function connectDB() {
    try {
        if (mongoose.connection.readyState === 1) {
            console.log('Already connected to MongoDB');
            return mongoose.connection;
        }

        mongoose.set('strictQuery', true);
        
        connection = await mongoose.connect(MONGODB_URI, {
            serverApi: {
                version: '1',
                strict: true,
                deprecationErrors: true,
            },
            maxPoolSize: 10
        });
        
        console.log('Connected to MongoDB successfully');
        return connection;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

// Handle connection events
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
});

// Handle application termination
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('Mongoose connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error closing mongoose connection:', err);
        process.exit(1);
    }
});

module.exports = { connectDB };
