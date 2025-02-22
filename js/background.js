chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ 
        chatHistory: [],
        darkMode: false
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'processMessage') {
        const responses = [
            "I'm here to help! What can I do for you?",
            "That's interesting! Tell me more.",
            "I understand. Is there anything specific you'd like to know?",
            "I'm still learning, but I'll do my best to assist you.",
            "Could you please elaborate on that?"
        ];

        setTimeout(() => {
            const response = responses[Math.floor(Math.random() * responses.length)];
            sendResponse({ response });
        }, 1000);

        return true; 
    }

    if (request.type === 'captureTab') {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ dataUrl });
            }
        });
        return true;
    }

    // Handle screenshot requests
    if (request.type === 'screenshot') {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ dataUrl });
            }
        });
        return true;
    }
});