// Function to create comment modal
function createCommentModal() {
    const modal = document.createElement('div');
    modal.className = 'comment-modal hidden';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Generated Comments</h2>
                <button class="modal-close" aria-label="Close">×</button>
            </div>
            <div class="loading-container hidden">
                <div class="loading-spinner">
                    <div class="spinner-dot"></div>
                    <div class="spinner-dot"></div>
                    <div class="spinner-dot"></div>
                    <div class="spinner-dot"></div>
                </div>
                <div class="loading-text">Generating comments...</div>
            </div>
            <div class="error-message hidden"></div>
            <div class="comments-list"></div>
        </div>
    `;

    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    document.body.appendChild(modal);
    return modal;
}

// Function to display comment options
function displayCommentOptions(comments, modal, commentField) {
    const commentsList = modal.querySelector('.comments-list');
    commentsList.innerHTML = '';
    
    // Store the reference to the post container
    const postContainer = commentField.closest('.feed-shared-update-v2') || 
                         commentField.closest('.feed-shared-post') ||
                         commentField.closest('.feed-shared-update');
    
    // Create a container for the entire comments section
    const commentsContainer = document.createElement('div');
    commentsContainer.className = 'comments-container';
    
    // Add action buttons container
    const actionButtonsContainer = document.createElement('div');
    actionButtonsContainer.className = 'action-buttons';

    // Add regenerate button
    const regenerateButton = document.createElement('button');
    regenerateButton.className = 'action-button regenerate-button';
    regenerateButton.innerHTML = '<i class="fas fa-sync-alt"></i> Regenerate Comments';
    regenerateButton.addEventListener('click', async () => {
        try {
            // Hide the current comments and show loading
            commentsContainer.style.display = 'none';
            const loadingContainer = modal.querySelector('.loading-container') || createLoadingContainer();
            if (!modal.contains(loadingContainer)) {
                modal.appendChild(loadingContainer);
            }
            loadingContainer.classList.remove('hidden');

            // Get post text using the stored post container reference
            const postText = getPostText(postContainer);
            if (!postText) {
                throw new Error('Could not find post content');
            }

            // Generate new comments
            const newComments = await fetchCommentSuggestions(postText);
            
            // Remove loading container and display new comments
            loadingContainer.classList.add('hidden');
            commentsContainer.style.display = 'block';
            displayCommentOptions(newComments, modal, commentField);
            showNotification('Comments regenerated successfully!', 'success');
        } catch (error) {
            console.error('Error regenerating comments:', error);
            showNotification('Failed to regenerate comments. Please try again.', 'error');
            commentsContainer.style.display = 'block';
        }
    });
    actionButtonsContainer.appendChild(regenerateButton);

    commentsContainer.appendChild(actionButtonsContainer);
    
    // Create a container for the comment cards
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'comment-cards';
    
    // Display each comment option
    comments.forEach((comment, index) => {
        const option = document.createElement('div');
        option.className = 'comment-option';
        
        // Ensure tone is properly formatted and defaulted if missing
        const tone = comment.tone || 'Neutral';
        const toneClass = tone.toLowerCase().replace(/\s+/g, '-');
        
        option.innerHTML = `
            <div class="comment-header">
                <span class="comment-tone ${toneClass}">${tone}</span>
            </div>
            <div class="comment-text">${comment.text || ''}</div>
            <div class="comment-actions">
                <button class="use-comment-button">Use This Comment</button>
            </div>
        `;
        
        option.querySelector('.use-comment-button').addEventListener('click', async () => {
            try {
                const postId = postContainer.getAttribute('data-urn') || 
                              postContainer.getAttribute('data-id');
                              
                const postUrl = window.location.href;
                
                // Prepare data for logging
                const commentData = {
                    postId: postId,
                    postUrl: postUrl,
                    postContent: getPostText(postContainer),
                    comment: {
                        text: comment.text,
                        tone: tone,
                        timestamp: new Date(),
                        isSelected: true
                    },
                    metrics: {
                        likes: 0,
                        replies: 0,
                        lastChecked: new Date()
                    }
                };
                
                // Send data to background script for storage
                const response = await chrome.runtime.sendMessage({
                    action: 'saveComment',
                    data: commentData
                });
                
                if (!response.success) {
                    throw new Error(response.error || 'Failed to save comment data');
                }
                
                // Update UI
                commentField.textContent = comment.text;
                commentField.dispatchEvent(new Event('input', { bubbles: true }));
                modal.classList.add('hidden');
                showNotification('Comment added successfully!', 'success');
                
            } catch (error) {
                console.error('Error saving comment:', error);
                showNotification('Error saving comment data', 'error');
            }
        });
        
        cardsContainer.appendChild(option);
    });
    
    // Append cards container to main container
    commentsContainer.appendChild(cardsContainer);
    // Append main container to comments list
    commentsList.appendChild(commentsContainer);

    // Hide loading container if it exists
    const loadingContainer = modal.querySelector('.loading-container');
    if (loadingContainer) {
        loadingContainer.classList.add('hidden');
    }

    // Make sure modal is visible
    modal.classList.remove('hidden');
}

// Function to get post text from the feed item
function getPostText(postElement) {
    if (!postElement) return '';
    
    // Try different possible post content selectors
    const contentSelectors = [
        '.feed-shared-update-v2__description',
        '.feed-shared-text-view',
        '.feed-shared-inline-show-more-text',
        '.feed-shared-update__description',
        '.update-components-text'
    ];
    
    for (const selector of contentSelectors) {
        const element = postElement.querySelector(selector);
        if (element) {
            return element.textContent.trim();
        }
    }
    
    return '';
}

// Function to parse API response
function parseApiResponse(responseText) {
    try {
        const response = JSON.parse(responseText);
        if (!response.output?.answer) {
            throw new Error('Invalid API response format');
        }

        // The answer contains a JSON string wrapped in markdown code blocks
        // First, remove the markdown code blocks
        const jsonStr = response.output.answer.replace(/```json\n|\n```/g, '');
        
        try {
            // Parse the inner JSON
            const commentsData = JSON.parse(jsonStr);
            
            if (!commentsData.comments || !Array.isArray(commentsData.comments)) {
                throw new Error('Invalid comments format');
            }

            // Default tones as fallback
            const defaultTones = ['Neutral', 'Positive', 'Friendly', 'Curious', 'Enthusiastic'];
            
            // Map the comments to our expected format, using the type field as tone
            return commentsData.comments.map((comment, index) => {
                let commentText = '';
                let commentTone = '';
                
                if (typeof comment === 'object') {
                    // New format with type and text fields
                    if (comment.text && comment.type) {
                        commentText = comment.text;
                        commentTone = comment.type;
                    } else if (comment.comment) {
                        // Old format with comment field
                        commentText = comment.comment;
                        commentTone = defaultTones[index % defaultTones.length];
                    }
                } else if (typeof comment === 'string') {
                    // String format
                    commentText = comment;
                    commentTone = defaultTones[index % defaultTones.length];
                }
                
                return {
                    text: commentText || '',
                    tone: commentTone || defaultTones[index % defaultTones.length]
                };
            });

        } catch (innerError) {
            console.error('Error parsing comments JSON:', innerError);
            throw new Error('Failed to parse comments data');
        }
    } catch (error) {
        console.error('Error parsing API response:', error);
        throw new Error('Failed to parse API response');
    }
}

// Function to clean and preprocess post text
function preprocessPostText(text) {
    if (!text) return '';
    
    // Remove duplicate content by splitting on common separators and taking unique parts
    const parts = text.split(/~+|…more/).filter(Boolean);
    const uniqueParts = Array.from(new Set(parts));
    
    let cleanText = uniqueParts[0] || ''; // Take the first unique part
    
    // Clean up the text
    cleanText = cleanText
        // Remove hashtags and mentions
        .replace(/(?:^|\s)(?:#|@)[\w-]+/g, '')
        // Remove emojis
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
        // Remove multiple spaces
        .replace(/\s+/g, ' ')
        // Remove URLs
        .replace(/https?:\/\/[^\s]+/g, '')
        // Remove special characters except basic punctuation
        .replace(/[^\w\s.,!?-]/g, ' ')
        // Trim whitespace
        .trim();
    
    console.log('Preprocessed text:', cleanText);
    return cleanText;
}

// Function to make API call with retry logic
async function fetchCommentSuggestions(postText) {
    // Preprocess the text before sending to API
    const cleanedText = preprocessPostText(postText);
    if (!cleanedText) {
        throw new Error('No valid text content found in post');
    }
    
    const maxRetries = 3;
    const baseDelay = 1000; // Start with 1 second delay
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`API attempt ${attempt}/${maxRetries} with cleaned text:`, cleanedText);
            
            const response = await fetch('https://api-bcbe5a.stack.tryrelevance.com/latest/studios/e24e0d8f-55bc-42b3-b4c0-ef86b7f9746c/trigger_limited', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    params: {
                        linked_in_post: cleanedText
                    },
                    project: "8cdcb88c-3a0b-44b1-915e-09454e18f5e5"
                })
            });
            
            console.log(`API Response Status (attempt ${attempt}):`, response.status);
            
            // If we get a 504 or other 5xx error, throw an error to trigger retry
            if (response.status >= 500) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            const text = await response.text();
            console.log(`API Response Text (attempt ${attempt}):`, text);
            
            if (!response.ok) {
                throw new Error(`API request failed: ${text || response.statusText}`);
            }
            
            // Parse API response
            const comments = parseApiResponse(text);
            
            return comments;
            
        } catch (error) {
            console.error(`Error in attempt ${attempt}:`, error);
            
            // If this was our last retry, throw the error
            if (attempt === maxRetries) {
                throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
            }
            
            // Calculate exponential backoff delay
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Function to create the comment generator button and modal
function createCommentButton() {
    const button = document.createElement('button');
    button.className = 'comment-generator-button';
    button.innerHTML = `
        <span class="icon">✨</span>
        <span>Generate Comment</span>
    `;
    
    // Add click handler
    button.addEventListener('click', handleCommentGeneration);
    
    return button;
}

// Function to create loading spinner
function createLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'loading-dots';
    spinner.innerHTML = `
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
    `;
    return spinner;
}

// Function to create comment options modal
function createCommentModal() {
    const modal = document.createElement('div');
    modal.className = 'comment-modal hidden';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Generated Comments</h2>
                <button class="modal-close" aria-label="Close">×</button>
            </div>
            <div class="loading-container hidden">
                <div class="loading-spinner">
                    <div class="spinner-dot"></div>
                    <div class="spinner-dot"></div>
                    <div class="spinner-dot"></div>
                    <div class="spinner-dot"></div>
                </div>
                <div class="loading-text">Generating comments...</div>
            </div>
            <div class="error-message hidden"></div>
            <div class="comments-list"></div>
        </div>
    `;

    // Add close button event listener
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    document.body.appendChild(modal);
    return modal;
}

// Function to handle comment generation
async function handleCommentGeneration(event) {
    try {
        const button = event.target;
        
        // Find the post container
        const postContainer = button.closest('.feed-shared-update-v2') || 
                            button.closest('.feed-shared-post') ||
                            button.closest('.feed-shared-update');
                            
        if (!postContainer) {
            throw new Error('Could not find post container. Please make sure you are on a LinkedIn post.');
        }

        // Get the post text
        const postText = getPostText(postContainer);
        if (!postText) {
            throw new Error('Could not find post content. Please make sure you are on a LinkedIn post.');
        }

        // Find or create the comment field
        const commentField = findCommentField(button);
        if (!commentField) {
            throw new Error('Could not find comment field. Please make sure you are on a LinkedIn post.');
        }

        // Show loading state
        const modal = createOrGetModal();
        modal.classList.remove('hidden'); // Make sure modal is visible
        showLoadingState(modal);

        // Generate comments
        const comments = await fetchCommentSuggestions(postText);
        
        // Display comment options
        displayCommentOptions(comments, modal, commentField);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message, 'error');
    }
}

// Function to find comment field
function findCommentField(button) {
    // First try to find the comment field within the post container
    const postContainer = button.closest('.feed-shared-update-v2') || 
                         button.closest('.feed-shared-post') ||
                         button.closest('.feed-shared-update');
                         
    if (!postContainer) return null;

    // Try different selectors for the comment field
    const commentFieldSelectors = [
        'div[contenteditable="true"]',
        'div[role="textbox"]',
        '.comments-comment-box__form-container div[contenteditable="true"]',
        '.comments-comment-texteditor__content'
    ];

    for (const selector of commentFieldSelectors) {
        const field = postContainer.querySelector(selector);
        if (field) return field;
    }

    return null;
}

// Function to create loading container
function createLoadingContainer() {
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'loading-container';
    loadingContainer.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-dot"></div>
            <div class="spinner-dot"></div>
            <div class="spinner-dot"></div>
            <div class="spinner-dot"></div>
        </div>
        <div class="loading-text">Generating comments...</div>
    `;
    return loadingContainer;
}

// Function to create or get modal
function createOrGetModal() {
    let modal = document.querySelector('.comment-modal');
    if (!modal) {
        modal = createCommentModal();
        document.body.appendChild(modal);
    }
    return modal;
}

// Function to show loading state
function showLoadingState(modal) {
    const loadingContainer = modal.querySelector('.loading-container');
    const errorMessage = modal.querySelector('.error-message');
    const commentsList = modal.querySelector('.comments-list');
    
    loadingContainer.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    commentsList.innerHTML = '';
}

// Function to show a notification to the user
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `comment-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 4px;
        background-color: ${type === 'error' ? '#ff4444' : '#4CAF50'};
        color: white;
        z-index: 10000;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Function to inject button for a comment field
function injectButtonForCommentField(commentField) {
    // Find the closest post container
    const post = commentField.closest('article, [data-urn]');
    if (!post) return;

    // Find the editor container
    const editorContainer = commentField.closest('.editor-container');
    if (!editorContainer) return;

    // Check if this post already has our button
    const existingButton = post.querySelector('.comment-generator-button');
    if (existingButton) return;

    // Create container for our button
    const container = document.createElement('div');
    container.className = 'comment-generator-container';
    
    // Add button to container
    container.appendChild(createCommentButton());
    
    // Insert container before editor
    editorContainer.parentElement.insertBefore(container, editorContainer);
}

// Function to check if we should inject a button
function shouldInjectButton(field) {
    // Check if the field is a comment input
    const isCommentField = field.getAttribute('role') === 'textbox' || 
                          field.classList.contains('comments-comment-box__input') ||
                          field.closest('.comments-comment-box');

    // Check if button already exists
    const container = field.closest('.comment-section')?.querySelector('.comment-generator-container');
    
    return isCommentField && !container;
}

// Initialize button injection
function initializeButtonInjection() {
    // Create a MutationObserver instance
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // Check for added nodes
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Look for comment fields in the added element
                    const commentFields = node.querySelectorAll('[contenteditable="true"]');
                    commentFields.forEach(field => {
                        if (shouldInjectButton(field)) {
                            injectButtonForCommentField(field);
                        }
                    });
                }
            });
        });
    });

    // Configure the observer
    const config = {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    };

    // Start observing the document
    observer.observe(document.body, config);

    // Also check for existing comment fields
    const existingCommentFields = document.querySelectorAll('[contenteditable="true"]');
    existingCommentFields.forEach(field => {
        if (shouldInjectButton(field)) {
            injectButtonForCommentField(field);
        }
    });
}

// Initialize when the document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeButtonInjection);
} else {
    initializeButtonInjection();
}

// Add styles
const style = document.createElement('style');
style.textContent = `
    .comment-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
    }

    .modal-content {
        background: white;
        width: 90%;
        max-width: 800px;
        max-height: 90vh;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: modalSlideIn 0.3s ease-out;
    }

    @keyframes modalSlideIn {
        from {
            transform: translateY(20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #e0e0e0;
        background: #f9fafb;
    }

    .modal-header h2 {
        margin: 0;
        font-size: 1.5rem;
        color: #1a1f36;
        font-weight: 600;
    }

    .modal-close {
        background: none;
        border: none;
        font-size: 28px;
        color: #666;
        cursor: pointer;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }

    .modal-close:hover {
        background: #f0f0f0;
        color: #333;
    }

    .comments-list {
        padding: 24px;
        overflow-y: auto;
        max-height: calc(90vh - 80px);
    }

    .action-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-bottom: 24px;
        padding: 0 4px;
    }

    .action-button {
        padding: 10px 20px;
        border-radius: 24px;
        border: none;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .action-button i {
        font-size: 16px;
    }

    .regenerate-button {
        background-color: #0a66c2;
        color: white;
    }

    .regenerate-button:hover {
        background-color: #004182;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .comment-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }

    .comment-option {
        background: white;
        border-radius: 12px;
        padding: 20px;
        margin: 0;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        border: 1px solid #e0e0e0;
    }

    .comment-option:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        border-color: #ccc;
    }

    .comment-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .comment-tone {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        margin-right: 8px;
        text-transform: uppercase;
    }

    .comment-text {
        font-size: 15px;
        line-height: 1.6;
        color: #1a1f36;
        flex-grow: 1;
        margin: 12px 0;
    }

    .comment-actions {
        display: flex;
        justify-content: flex-end;
    }

    .use-comment-button {
        background: #0a66c2;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        font-size: 14px;
    }

    .use-comment-button:hover {
        background: #004182;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .comment-tone.neutral { 
        background: #f3f6f8; 
        color: #475569;
    }
    .comment-tone.positive { 
        background: #dcfce7; 
        color: #166534;
    }
    .comment-tone.friendly { 
        background: #fff7ed; 
        color: #9a3412;
    }
    .comment-tone.curious { 
        background: #eff6ff; 
        color: #1e40af;
    }
    .comment-tone.enthusiastic { 
        background: #fdf2f8; 
        color: #be185d;
    }
    .comment-tone.serious { 
        background: #f8fafc; 
        color: #334155;
    }
    .comment-tone.empathetic { 
        background: #f3e8ff; 
        color: #6b21a8;
    }

    .loading-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 40px;
        gap: 20px;
    }

    .loading-text {
        color: #666;
        font-size: 14px;
        font-weight: 500;
    }

    .loading-spinner {
        display: flex;
        flex-direction: column;
        gap: 4px;
        height: 60px;
        align-items: center;
    }

    .spinner-dot {
        width: 8px;
        height: 8px;
        background-color: #0a66c2;
        border-radius: 50%;
        animation: pulseAndMove 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        opacity: 0;
    }

    .spinner-dot:nth-child(1) {
        animation-delay: 0s;
    }

    .spinner-dot:nth-child(2) {
        animation-delay: 0.3s;
    }

    .spinner-dot:nth-child(3) {
        animation-delay: 0.6s;
    }

    .spinner-dot:nth-child(4) {
        animation-delay: 0.9s;
    }

    @keyframes pulseAndMove {
        0% {
            transform: translateY(0);
            opacity: 0;
        }
        25% {
            opacity: 0.5;
        }
        50% {
            transform: translateY(20px);
            opacity: 1;
        }
        75% {
            opacity: 0.5;
        }
        100% {
            transform: translateY(40px);
            opacity: 0;
        }
    }

    .notification {
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 16px 24px;
        border-radius: 12px;
        background: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10001;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
        font-size: 14px;
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .notification.success {
        border-left: 4px solid #22c55e;
    }

    .notification.error {
        border-left: 4px solid #ef4444;
    }

    .notification i {
        font-size: 20px;
    }

    .notification.success i {
        color: #22c55e;
    }

    .notification.error i {
        color: #ef4444;
    }
`;

document.head.appendChild(style);

const styles = `
    .comments-container {
        padding: 20px;
        background: #fff;
    }

    .comments-heading {
        font-size: 20px;
        font-weight: 600;
        color: #000;
        margin: 0 0 20px 0;
        padding: 0 0 12px 0;
        border-bottom: 1px solid #e0e0e0;
        text-align: center;
        display: block;
        width: 100%;
    }

    .comment-cards {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .comment-option {
        background: #fff;
        border-radius: 8px;
        padding: 16px;
        margin: 0;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        border: 1px solid #e0e0e0;
    }

    .comment-header {
        margin-bottom: 12px;
    }

    .comment-tone {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 14px;
        font-weight: 500;
        margin-right: 8px;
        text-transform: capitalize;
    }

    /* Tone-specific styles */
    .comment-tone.neutral { background: #f3f6f8; color: #666; }
    .comment-tone.positive { background: #e6f7e6; color: #1a7f37; }
    .comment-tone.friendly { background: #fff3e0; color: #b36200; }
    .comment-tone.curious { background: #e3f2fd; color: #0969da; }
    .comment-tone.enthusiastic { background: #fce4ec; color: #c2185b; }
    .comment-tone.serious { background: #efebe9; color: #4e342e; }
    .comment-tone.empathetic { background: #f3e5f5; color: #7b1fa2; }
    .comment-tone.urgent { background: #ffebee; color: #c62828; }
    .comment-tone.informative { background: #e8eaf6; color: #1a237e; }

    .comment-text {
        font-size: 14px;
        line-height: 1.5;
        color: #333;
        margin-bottom: 12px;
        white-space: pre-wrap;
        word-wrap: break-word;
    }

    .comment-actions {
        display: flex;
        justify-content: flex-end;
    }

    .use-comment-button {
        background: #0a66c2;
        color: white;
        border: none;
        border-radius: 16px;
        padding: 8px 16px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .use-comment-button:hover {
        background-color: #004182;
    }
`;

// Add styles to the document
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
