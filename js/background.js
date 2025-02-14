chrome.runtime.onInstalled.addListener(() => {
    // Initialize storage with empty chat history
    chrome.storage.local.set({ 
        chatHistory: [],
        darkMode: false
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'processMessage') {
        // Simple response logic
        const responses = [
            "I'm here to help! What can I do for you?",
            "That's interesting! Tell me more.",
            "I understand. Is there anything specific you'd like to know?",
            "I'm still learning, but I'll do my best to assist you.",
            "Could you please elaborate on that?"
        ];
        
        // Simulate processing delay
        setTimeout(() => {
            const response = responses[Math.floor(Math.random() * responses.length)];
            sendResponse({ response });
        }, 1000);
        
        return true; // Will respond asynchronously
    }
});
