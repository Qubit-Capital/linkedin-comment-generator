// Function to get post text using multiple selectors
function getPostText(button) {
    // Find the post container by traversing up from the button
    const postContainer = button.closest('.feed-shared-update-v2') || 
                         button.closest('.feed-shared-post') ||
                         button.closest('.feed-shared-update') ||
                         button.closest('div[data-urn]');
    
    if (!postContainer) {
        console.log('Could not find post container');
        return null;
    }

    // Get the main post content first (excluding replies)
    const mainPostContent = postContainer.querySelector('.feed-shared-update-v2__description');
    if (mainPostContent) {
        const text = mainPostContent.textContent.trim();
        if (text) {
            console.log('Found main post content:', text);
            return text;
        }
    }

    // Fallback selectors for different post types
    const selectors = [
        '.feed-shared-text-view span[dir="ltr"]',
        '.feed-shared-text',
        '.update-components-text',
        '[data-test-id="main-feed-activity-card__commentary"]'
    ];

    // Try each selector but exclude reply sections
    for (const selector of selectors) {
        const elements = Array.from(postContainer.querySelectorAll(selector))
            .filter(el => !el.closest('.comments-comment-item')); // Exclude replies
        
        if (elements.length > 0) {
            // Get text from the first matching element
            const text = elements[0].textContent.trim();
            if (text) {
                console.log(`Found post text using selector: ${selector}`);
                return text;
            }
        }
    }

    console.log('No post text found');
    return null;
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

// Function to display comment options
function displayCommentOptions(comments, modal, commentField) {
    const commentsList = modal.querySelector('.comments-list');
    commentsList.innerHTML = '';
    
    // Create a container for the entire comments section
    const commentsContainer = document.createElement('div');
    commentsContainer.className = 'comments-container';
    
    // Add heading for generated comments
    const heading = document.createElement('h2');
    heading.className = 'comments-heading';
    heading.textContent = 'Generated Comments';
    commentsContainer.appendChild(heading);
    
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
        
        option.querySelector('.use-comment-button').addEventListener('click', () => {
            commentField.textContent = comment.text;
            commentField.dispatchEvent(new Event('input', { bubbles: true }));
            modal.classList.add('hidden');
            showNotification('Comment added successfully!', 'success');
        });
        
        cardsContainer.appendChild(option);
    });
    
    // Append cards container to main container
    commentsContainer.appendChild(cardsContainer);
    // Append main container to comments list
    commentsList.appendChild(commentsContainer);
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
                <h3 class="modal-title">Choose a Comment</h3>
                <button class="close-button">×</button>
            </div>
            <div class="modal-body">
                <div class="loading-container hidden">
                    ${createLoadingSpinner().outerHTML}
                    <p>Generating comment...</p>
                </div>
                <div class="error-message hidden">
                    Failed to generate comment. Please try again.
                </div>
                <div class="comments-list"></div>
            </div>
        </div>
    `;
    
    // Add close button handler
    modal.querySelector('.close-button').addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    return modal;
}

// Function to handle comment generation
async function handleCommentGeneration(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget;
    const commentField = button.closest('.comment-generator-container')
        .nextElementSibling
        .querySelector('[contenteditable="true"]');
    
    if (!commentField) return;
    
    // Get or create modal
    let modal = document.querySelector('.comment-modal');
    if (!modal) {
        modal = createCommentModal();
        document.body.appendChild(modal);
    }
    
    // Show modal and loading state
    modal.classList.remove('hidden');
    const loadingContainer = modal.querySelector('.loading-container');
    const errorMessage = modal.querySelector('.error-message');
    const commentsList = modal.querySelector('.comments-list');
    
    loadingContainer.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    commentsList.innerHTML = '';
    
    try {
        const postText = getPostText(button);
        if (!postText) {
            throw new Error('Could not find post content. Please make sure you are on a LinkedIn post.');
        }
        
        console.log('Extracted post text:', postText);
        const comments = await fetchCommentSuggestions(postText);
        
        loadingContainer.classList.add('hidden');
        displayCommentOptions(comments, modal, commentField);
    } catch (error) {
        console.error('Error:', error);
        loadingContainer.classList.add('hidden');
        errorMessage.classList.remove('hidden');
        errorMessage.textContent = error.message || 'Failed to generate comment. Please try again.';
        showNotification(error.message || 'Failed to generate comment. Please try again.', 'error');
    }
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
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
    }
    
    .modal-title {
        font-size: 18px;
        font-weight: 600;
        color: #333;
    }
    
    .close-button {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
    }
    
    .comments-list {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }
    
    .comment-option {
        background: #f8f9fa;
        border: 1px solid #e1e4e8;
        border-radius: 8px;
        padding: 15px;
        transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .comment-option:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .comment-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .comment-tone {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
    }
    
    .comment-tone.neutral {
        background-color: #e1e4e8;
        color: #24292e;
    }
    
    .comment-tone.positive {
        background-color: #dcffe4;
        color: #1a7f37;
    }
    
    .comment-tone.friendly {
        background-color: #fff3e0;
        color: #9a6700;
    }
    
    .comment-tone.curious {
        background-color: #ddf4ff;
        color: #0969da;
    }
    
    .comment-text {
        font-size: 14px;
        line-height: 1.5;
        color: #24292e;
        margin-bottom: 12px;
        white-space: pre-wrap;
    }
    
    .comment-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }
    
    .use-comment-button {
        background-color: #0a66c2;
        color: white;
        border: none;
        border-radius: 16px;
        padding: 8px 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .use-comment-button:hover {
        background-color: #004182;
    }
    
    .loading-container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
    }
    
    .loading-dots {
        display: flex;
        gap: 4px;
    }
    
    .dot {
        width: 8px;
        height: 8px;
        background-color: #0a66c2;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out;
    }
    
    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
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
    .comment-tone.positive { background: #e6f7e6; color: #0a7a0a; }
    .comment-tone.friendly { background: #fff3e0; color: #b36200; }
    .comment-tone.curious { background: #e3f2fd; color: #0055b3; }
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
        font-weight: 600;
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
