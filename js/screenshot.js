// Screenshot functionality
document.addEventListener('DOMContentLoaded', function() {
    const screenshotBtn = document.getElementById('screenshotBtn');
    if (screenshotBtn) {
        screenshotBtn.addEventListener('click', captureScreenshot);
    }
});

// Initialize screenshots array
window.screenshots = [];

async function captureScreenshot() {
    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Take screenshot
        const screenshotUrl = await chrome.tabs.captureVisibleTab();
        
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
        
    } catch (error) {
        console.error('Screenshot error:', error);
    }
}
