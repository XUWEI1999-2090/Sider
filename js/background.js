// 启动Python API服务器的函数
function startPythonServer() {
  // 使用chrome.runtime.getURL获取API服务器脚本的URL
  const scriptUrl = chrome.runtime.getURL('Visual/api_server.py');

  // 使用fetch或其他方式运行服务器
  console.log('Starting Python API server at:', scriptUrl);

  // 在实际的扩展中，您需要使用原生消息传递或其他方式启动Python服务器
  // 这里仅作为示例，实际实现可能需要更复杂的方式
  fetch('http://localhost:5000/api/status')
    .then(response => {
      console.log('API服务器已运行');
    })
    .catch(error => {
      console.warn('API服务器可能未运行，请确保手动启动API服务器');
    });
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
    // Initialize the conversations array in storage if it doesn't exist
    chrome.storage.local.get(['conversations', 'currentConversationId'], function(result) {
      if (!result.conversations) {
        chrome.storage.local.set({ 
          conversations: [],
          currentConversationId: null 
        });
      }
    });

  // 尝试启动Python API服务器
  startPythonServer();
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

// Chrome 扩展 API 中没有 sidePanel.close() 方法
// 我们只能打开侧边栏，无法通过扩展 API 关闭它
// 用户需要手动点击侧边栏上的关闭按钮

chrome.action.onClicked.addListener((tab) => {
    // 打开侧边栏
    chrome.sidePanel.open({ windowId: tab.windowId });
});