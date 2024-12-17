const { connectDB, disconnectDB } = require('./db/config');

async function testConnection() {
    try {
        console.log('Testing MongoDB connection...');
        const connection = await connectDB();
        
        if (connection) {
            console.log('Successfully connected to MongoDB!');
            console.log('Connection state:', connection.connection.readyState);
            console.log('Database name:', connection.connection.name);
        }
        
        await disconnectDB();
    } catch (error) {
        console.error('Connection test failed:', error);
    }
}

testConnection();
