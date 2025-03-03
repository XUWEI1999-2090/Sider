
// Manual screenshot functionality with selection overlay
let overlay = null;
let startX = 0;
let startY = 0;
let endX = 0;
let endY = 0;
let isSelecting = false;

function startManualScreenshot() {
    // Send message to content script to create overlay
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            type: 'CREATE_SCREENSHOT_OVERLAY'
        });
    });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'MANUAL_SCREENSHOT_COMPLETED') {
        // Process the screenshot data
        const screenshotUrl = request.screenshotData;
        
        // Show preview
        const preview = document.getElementById('attachmentPreview');
        const container = document.getElementById('previewContainer');
        preview.classList.remove('d-none');

        // Create new preview element
        const previewContent = document.createElement('div');
        previewContent.className = 'preview-content';
        
        const img = document.createElement('img');
        img.className = 'screenshot-preview';
        img.src = screenshotUrl;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-close';
        removeBtn.innerHTML = '<i data-feather="x"></i>';
        
        previewContent.appendChild(img);
        previewContent.appendChild(removeBtn);
        container.appendChild(previewContent);
        
        // Update feather icons
        feather.replace();
        
        // Store screenshot URL
        window.screenshots.push(screenshotUrl);

        // Setup remove attachment button
        removeBtn.onclick = () => {
            previewContent.remove();
            window.screenshots = window.screenshots.filter(url => url !== screenshotUrl);
            if (window.screenshots.length === 0) {
                preview.classList.add('d-none');
            }
        };
    }
    return true;
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const manualScreenshotBtn = document.getElementById('manualScreenshotBtn');
    if (manualScreenshotBtn) {
        manualScreenshotBtn.addEventListener('click', startManualScreenshot);
    }
});
