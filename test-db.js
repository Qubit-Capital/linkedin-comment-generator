const { MongoClient, ServerApiVersion } = require('mongodb');

// Use the simpler connection string without SRV
const uri = "mongodb+srv://malaygupta:3VXz24KhjZJEbX55@linkedin-comment-genera.oq68x.mongodb.net/?retryWrites=true&w=majority&appName=linkedin-comment-generator";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    maxPoolSize: 1
});

async function testDatabaseOperations() {
    try {
        console.log('Attempting to connect to MongoDB...');
        await client.connect();
        console.log('Connected to MongoDB');

        // First, test the connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. Successfully connected to MongoDB!");

        const db = client.db("linkedin_comments");
        
        // Test 1: Save a comment
        const testComment = {
            postId: 'test-linkedin-post-123',
            postContent: 'This is a test LinkedIn post about AI innovations',
            postMetadata: {
                authorName: 'Test User',
                authorId: 'test-user-123',
                postUrl: 'https://linkedin.com/post/test123',
                timestamp: new Date(),
                engagement: {
                    likes: 150,
                    comments: 45,
                    shares: 20
                }
            },
            generatedComments: [{
                text: 'Fascinating insights about AI! Looking forward to more content like this.',
                tone: 'enthusiastic',
                timestamp: new Date(),
                isSelected: true,
                aiMetadata: {
                    model: "gpt-3.5-turbo",
                    generationTime: 1.5
                }
            }],
            createdAt: new Date()
        };

        // Save comment
        const saveResult = await db.collection("comments").insertOne(testComment);
        console.log('Test comment saved:', saveResult);

        // Test 2: Retrieve the comment
        const savedComment = await db.collection("comments").findOne({ postId: 'test-linkedin-post-123' });
        console.log('Retrieved comment:', savedComment);

        // Test 3: Update the comment
        const updateResult = await db.collection("comments").updateOne(
            { postId: 'test-linkedin-post-123' },
            { 
                $push: { 
                    generatedComments: {
                        text: 'Another great perspective on AI developments!',
                        tone: 'professional',
                        timestamp: new Date(),
                        isSelected: false,
                        aiMetadata: {
                            model: "gpt-3.5-turbo",
                            generationTime: 1.2
                        }
                    }
                }
            }
        );
        console.log('Comment updated:', updateResult);

        // Test 4: Clean up
        const deleteResult = await db.collection("comments").deleteOne({ postId: 'test-linkedin-post-123' });
        console.log('Test data cleaned up:', deleteResult);

    } catch (error) {
        console.error('Error during testing:', error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run the tests
testDatabaseOperations();
