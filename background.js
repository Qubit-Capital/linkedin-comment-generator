const { MongoClient } = require('mongodb');
const { connectDB } = require('./db/config');
const { startEngagementTracking, updateEngagementMetrics, Engagement } = require('./db/engagement-operations');
const uri = "mongodb+srv://malaygupta:3VXz24KhjZJEbX55@linkedin-comment-genera.oq68x.mongodb.net/?retryWrites=true&w=majority&appName=linkedin-comment-generator";
const client = new MongoClient(uri);

// Initialize database connection
connectDB().catch(console.error);

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveComment") {
        saveCommentToDb(request.data)
            .then(async (result) => {
                // Start tracking engagement for the saved comment
                await startEngagementTracking(result.comment._id);
                sendResponse({ success: true, result });
            })
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Will respond asynchronously
    }
    
    if (request.action === "getComments") {
        getCommentsFromDb(request.postId)
            .then(comments => sendResponse({ success: true, comments }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (request.action === 'generateComments') {
        handleCommentGeneration(request.postData, request.userContext)
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Will respond asynchronously
    }

    if (request.action === 'generateComment') {
        const response = await fetch('https://api-bcbe5a.stack.tryrelevance.com/latest/studios/e24e0d8f-55bc-42b3-b4c0-ef86b7f9746c/trigger_limited', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                params: {
                    linked_in_post: request.postText
                },
                project: "8cdcb88c-3a0b-44b1-915e-09454e18f5e5"
            })
        });

        if (!response.ok) {
            sendResponse({ success: false, error: `API request failed: ${response.statusText}` });
            return true;
        }

        const text = await response.text();
        sendResponse({ success: true, data: text });
        return true;
    }

    if (request.action === 'updateEngagement') {
        updateCommentEngagement(request.commentId, request.metrics)
            .then(result => sendResponse({ success: true, result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

async function handleCommentGeneration(postData, userContext) {
    try {
        // Save the post data
        await savePostToDb({
            postId: postData.id,
            postContent: postData.content,
            postUrl: postData.url,
            authorId: postData.authorId,
            authorName: postData.authorName,
            metadata: {
                likes: postData.likes,
                comments: postData.comments,
                shares: postData.shares
            }
        });

        // Generate comments using existing API
        const generatedComments = await generateCommentsFromAPI(postData.content);

        // Save generated comments
        const savedComment = await saveGeneratedCommentsToDb(postData.id, generatedComments, userContext);

        // Start engagement tracking
        await startEngagementTracking(savedComment, postData.url);

        // Update analytics
        await updateAnalytics({
            generationTime: performance.now(),
            tones: generatedComments.map(comment => comment.tone)
        });

        return { success: true, comments: generatedComments };
    } catch (error) {
        console.error('Error in comment generation:', error);
        throw error;
    }
}

async function savePostToDb(postData) {
    try {
        await client.connect();
        const db = client.db("linkedin_comments");
        const collection = db.collection("posts");
        
        const postDoc = {
            postId: postData.postId,
            postContent: postData.postContent,
            postUrl: postData.postUrl,
            authorId: postData.authorId,
            authorName: postData.authorName,
            metadata: {
                likes: postData.metadata.likes,
                comments: postData.metadata.comments,
                shares: postData.metadata.shares
            },
            createdAt: new Date()
        };
        
        const result = await collection.insertOne(postDoc);
        console.log("Post saved to database:", result);
        return result;
    } catch (error) {
        console.error("Error saving to database:", error);
        throw error;
    } finally {
        await client.close();
    }
}

async function saveGeneratedCommentsToDb(postId, generatedComments, userContext) {
    try {
        await client.connect();
        const db = client.db("linkedin_comments");
        const collection = db.collection("generated_comments");
        
        const generatedCommentsDoc = {
            postId,
            generatedComments: generatedComments.map(comment => ({
                text: comment.text,
                tone: comment.tone,
                timestamp: new Date(),
                aiMetadata: {
                    model: 'gpt-3.5-turbo',
                    confidence: comment.confidence || 0.95
                },
                isSelected: false
            })),
            userContext: {
                preferredTone: userContext?.preferredTone || 'professional',
                customInstructions: userContext?.customInstructions || ''
            },
            createdAt: new Date()
        };
        
        const result = await collection.insertOne(generatedCommentsDoc);
        console.log("Generated comments saved to database:", result);
        return generatedCommentsDoc;
    } catch (error) {
        console.error("Error saving to database:", error);
        throw error;
    } finally {
        await client.close();
    }
}

async function updateAnalytics(analyticsData) {
    try {
        await client.connect();
        const db = client.db("linkedin_comments");
        const collection = db.collection("analytics");
        
        const analyticsDoc = {
            timestamp: new Date(),
            generationTime: analyticsData.generationTime,
            tones: analyticsData.tones,
            // Add any other analytics data you want to track
        };
        
        const result = await collection.insertOne(analyticsDoc);
        console.log("Analytics updated:", result);
        return result;
    } catch (error) {
        console.error("Error updating analytics:", error);
        throw error;
    } finally {
        await client.close();
    }
}

async function saveCommentToDb(data) {
    try {
        // Create engagement document
        const engagement = new Engagement({
            postMeta: {
                postId: data.postId,
                postUrl: data.postUrl,
                postContent: data.postContent,
                postDate: new Date(),
                postEngagement: {
                    likes: 0,
                    comments: 0,
                    shares: 0,
                    lastChecked: new Date()
                }
            },
            generatedComments: [{
                text: data.comment.text,
                tone: data.comment.tone,
                timestamp: data.comment.timestamp,
                isSelected: data.comment.isSelected
            }],
            selectedComment: {
                text: data.comment.text,
                selectionDate: new Date(),
                metrics: {
                    likes: 0,
                    replies: 0,
                    lastChecked: new Date()
                },
                performance: {
                    clickThroughRate: 0,
                    conversionRate: 0,
                    responseTime: 0
                }
            },
            tracking: {
                period: {
                    start: new Date(),
                    isActive: true
                },
                history: [{
                    timestamp: new Date(),
                    metrics: {
                        likes: 0,
                        replies: 0,
                        engagement: {
                            clickThroughRate: 0,
                            conversionRate: 0,
                            responseTime: 0
                        }
                    }
                }],
                trends: {
                    likesGrowthRate: 0,
                    repliesGrowthRate: 0,
                    overallScore: 0,
                    lastCalculated: new Date()
                }
            }
        });

        // Save to database
        const savedEngagement = await engagement.save();
        console.log('Saved comment data:', savedEngagement);
        
        // Start engagement tracking
        startEngagementTracking(savedEngagement._id);
        
        return { success: true, comment: savedEngagement };
    } catch (error) {
        console.error('Error saving comment:', error);
        throw error;
    }
}

async function getCommentsFromDb(postId) {
    try {
        await client.connect();
        const db = client.db("linkedin_comments");
        const collection = db.collection("comments");
        
        const comments = await collection.find({ postId }).toArray();
        return comments;
    } catch (error) {
        console.error("Error retrieving from database:", error);
        throw error;
    } finally {
        await client.close();
    }
}

async function updateCommentEngagement(commentId, metrics) {
    try {
        return await updateEngagementMetrics(commentId, {
            likes: metrics.likes,
            replies: metrics.replies,
            clickThroughRate: metrics.clickThroughRate,
            conversionRate: metrics.conversionRate,
            responseTime: metrics.responseTime
        });
    } catch (error) {
        console.error("Error updating engagement metrics:", error);
        throw error;
    }
}

// Your existing API call function
async function generateCommentsFromAPI(postContent) {
    // Implementation remains the same
    return [];
}
