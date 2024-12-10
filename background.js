const db = require('./db/operations');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generateComments') {
        handleCommentGeneration(request.postData, request.userContext)
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Will respond asynchronously
    }
});

async function handleCommentGeneration(postData, userContext) {
    try {
        // Save the post data
        await db.savePost({
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
        await db.saveGeneratedComments(postData.id, generatedComments, userContext);

        // Update analytics
        await db.updateAnalytics({
            generationTime: performance.now(),
            tones: generatedComments.map(comment => comment.tone)
        });

        return { success: true, comments: generatedComments };
    } catch (error) {
        console.error('Error in comment generation:', error);
        throw error;
    }
}

// Function to handle comment selection
async function handleCommentSelection(postId, selectedComment) {
    try {
        await db.updateSelectedComment(postId, selectedComment);
        return { success: true };
    } catch (error) {
        console.error('Error updating selected comment:', error);
        throw error;
    }
}

// Your existing API call function
async function generateCommentsFromAPI(postContent) {
    // Your existing API call implementation
    // This should return an array of comments with their tones
}
