// Content script for interacting with web pages
console.log('Content script loaded');

// 避免影响页面布局，检查是否是我们想要修改的页面
function shouldModifyPage() {
    // 这里可以添加逻辑判断当前页面是否应该被修改
    // 例如，检查URL是否包含特定域名
    // 如果您不想在Claude页面上运行，可以加这个判断
    if (window.location.href.includes('claude.ai')) {
        return false;
    }
    return true; // 默认情况下不修改页面
}

// 只有在应该修改页面的情况下添加事件监听器
if (shouldModifyPage()) {
    // Add keyboard shortcut to open sidebar
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Shift + S to toggle sidebar
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
            try {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDEBAR' });
} catch (e) {
    console.warn('Extension context may have been invalidated');
}
        }
    });

    // 处理文本选择
    document.addEventListener('mouseup', function(e) {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText.length > 0) {
            // 只有当文本被选中时才发送消息
            chrome.runtime.sendMessage({
                type: 'SELECTED_TEXT',
                text: selectedText
            });
        }
    });
}

// Screenshot overlay functionality
let screenshotOverlay = null;
let startX = 0;
let startY = 0;
let endX = 0;
let endY = 0;
let isSelecting = false;

function createScreenshotOverlay() {
    // Create overlay element
    screenshotOverlay = document.createElement('div');
    screenshotOverlay.id = 'screenshot-overlay';
    screenshotOverlay.style.position = 'fixed';
    screenshotOverlay.style.top = '0';
    screenshotOverlay.style.left = '0';
    screenshotOverlay.style.width = '100%';
    screenshotOverlay.style.height = '100%';
    screenshotOverlay.style.zIndex = '9999999';
    screenshotOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    screenshotOverlay.style.cursor = 'crosshair';
    
    // Create selection element
    const selection = document.createElement('div');
    selection.id = 'screenshot-selection';
    selection.style.position = 'absolute';
    selection.style.border = '1px dashed #fff';
    selection.style.backgroundColor = 'rgba(66, 133, 244, 0.2)';
    selection.style.display = 'none';
    
    screenshotOverlay.appendChild(selection);
    document.body.appendChild(screenshotOverlay);
    
    // Add event listeners
    screenshotOverlay.addEventListener('mousedown', startSelection);
    screenshotOverlay.addEventListener('mousemove', updateSelection);
    screenshotOverlay.addEventListener('mouseup', endSelection);
    
    // Add cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.position = 'fixed';
    cancelBtn.style.bottom = '20px';
    cancelBtn.style.right = '20px';
    cancelBtn.style.padding = '8px 16px';
    cancelBtn.style.backgroundColor = '#f44336';
    cancelBtn.style.color = 'white';
    cancelBtn.style.border = 'none';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.addEventListener('click', removeOverlay);
    
    screenshotOverlay.appendChild(cancelBtn);
}

function startSelection(e) {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const selection = document.getElementById('screenshot-selection');
    selection.style.left = startX + 'px';
    selection.style.top = startY + 'px';
    selection.style.width = '0';
    selection.style.height = '0';
    selection.style.display = 'block';
}

function updateSelection(e) {
    if (!isSelecting) return;
    
    endX = e.clientX;
    endY = e.clientY;
    
    const selection = document.getElementById('screenshot-selection');
    
    // Calculate dimensions
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    selection.style.left = left + 'px';
    selection.style.top = top + 'px';
    selection.style.width = width + 'px';
    selection.style.height = height + 'px';
}

function endSelection(e) {
    if (!isSelecting) return;
    isSelecting = false;
    
    endX = e.clientX;
    endY = e.clientY;
    
    // Ensure we have a valid selection
    if (Math.abs(endX - startX) < 10 || Math.abs(endY - startY) < 10) {
        return; // Selection too small, ignore
    }
    
    captureSelectedArea();
}

function captureSelectedArea() {
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    // First capture the entire visible tab
    chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' }, function(response) {
        if (response && response.screenshotUrl) {
            cropImage(response.screenshotUrl, left, top, width, height);
        }
    });
}

function cropImage(imageUrl, left, top, width, height) {
    // Create an image element to load the screenshot
    const img = new Image();
    img.onload = function() {
        // Create a canvas to draw the cropped image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Get device pixel ratio to handle high-DPI displays
        const dpr = window.devicePixelRatio || 1;
        
        // Draw the cropped portion
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 
            left * dpr, top * dpr, 
            width * dpr, height * dpr, 
            0, 0, width, height);
        
        // Get the data URL of the cropped image
        const croppedImageUrl = canvas.toDataURL('image/png');
        
        // Send the cropped image back to the extension
        chrome.runtime.sendMessage({
            type: 'MANUAL_SCREENSHOT_COMPLETED',
            screenshotData: croppedImageUrl
        });
        
        // Remove the overlay
        removeOverlay();
    };
    
    img.src = imageUrl;
}

function removeOverlay() {
    if (screenshotOverlay) {
        document.body.removeChild(screenshotOverlay);
        screenshotOverlay = null;
    }
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_PAGE_CONTENT') {
        sendResponse({
            title: document.title,
            url: window.location.href,
            content: document.body.innerText
        });
    } else if (request.type === 'CREATE_SCREENSHOT_OVERLAY') {
        createScreenshotOverlay();
        sendResponse({ success: true });
    }
    return true;
});
