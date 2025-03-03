// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

// 存储选中的文本
let selectedTexts = [];

// 确保在插件启动时初始化数组
chrome.runtime.onStartup.addListener(() => {
    selectedTexts = [];
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'OPEN_SIDEBAR') {
        chrome.sidePanel.open({ windowId: sender.tab.windowId });
    } else if (request.type === 'CAPTURE_TAB') {
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, (screenshotUrl) => {
            sendResponse({ screenshotUrl: screenshotUrl });
        });
        return true; // Indicates async response
    } else if (request.type === 'SELECTED_TEXT') {
        // 存储选中的文本
        selectedTexts.push(request.text);
        
        // 向popup页面发送消息，通知有新的选中文本
        chrome.runtime.sendMessage({
            type: 'NEW_SELECTED_TEXT',
            text: request.text
        });
    } else if (request.type === 'GET_SELECTED_TEXTS') {
        // 返回所有选中的文本并清空
        sendResponse({ selectedTexts: [...selectedTexts] });
        selectedTexts = [];
        return true;
    }
    return true;
});

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.captureVisibleTab(tab.windowId, {}, (image) => {
        // 处理截图，例如保存或发送到其他地方
        console.log(image);
    });
});
