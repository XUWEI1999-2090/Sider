document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();

    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const darkModeToggle = document.getElementById('darkMode');
    const clearHistoryBtn = document.getElementById('clearHistory');
    
    // Load saved settings
    chrome.storage.local.get(['darkMode'], function(result) {
        if (result.darkMode) {
            document.body.classList.add('dark-mode');
            darkModeToggle.checked = true;
        }
    });

    // Settings button click handler
    settingsBtn.addEventListener('click', () => {
        settingsPanel.style.display = 
            settingsPanel.style.display === 'block' ? 'none' : 'block';
    });

    // Dark mode toggle handler
    darkModeToggle.addEventListener('change', function() {
        document.body.classList.toggle('dark-mode');
        chrome.storage.local.set({ darkMode: this.checked });
    });

    // Clear history handler
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear chat history?')) {
            chrome.storage.local.remove('chatHistory', () => {
                document.getElementById('chatMessages').innerHTML = '';
                settingsPanel.style.display = 'none';
            });
        }
    });

    // Click outside settings panel to close
    document.addEventListener('click', (e) => {
        if (!settingsPanel.contains(e.target) && 
            !settingsBtn.contains(e.target) && 
            settingsPanel.style.display === 'block') {
            settingsPanel.style.display = 'none';
        }
    });
});
