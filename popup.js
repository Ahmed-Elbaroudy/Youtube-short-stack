// Initialize popup with saved settings
document.addEventListener('DOMContentLoaded', () => {
  // Get the toggle switches and button
  const autoSortToggle = document.getElementById('auto-sort');
  const showBadgesToggle = document.getElementById('show-badges');
  const sortNowButton = document.getElementById('sort-now');
  
  // Load saved settings
  chrome.storage.sync.get({
    autoSort: true,
    showBadges: true
  }, (settings) => {
    autoSortToggle.checked = settings.autoSort;
    showBadgesToggle.checked = settings.showBadges;
  });
  
  // Save settings when toggles change
  autoSortToggle.addEventListener('change', () => {
    chrome.storage.sync.set({
      autoSort: autoSortToggle.checked
    });
    
    // Send message to content script
    sendMessageToActiveTab({
      action: 'updateSettings',
      autoSort: autoSortToggle.checked
    });
  });
  
  showBadgesToggle.addEventListener('change', () => {
    chrome.storage.sync.set({
      showBadges: showBadgesToggle.checked
    });
    
    // Send message to content script
    sendMessageToActiveTab({
      action: 'updateSettings',
      showBadges: showBadgesToggle.checked
    });
  });
  
  // Sort the current page when button clicked
  sortNowButton.addEventListener('click', () => {
    sendMessageToActiveTab({
      action: 'sortNow'
    });
    
    // Add visual feedback
    sortNowButton.style.transform = 'scale(0.95)';
    setTimeout(() => {
      sortNowButton.style.transform = '';
    }, 100);
  });
  
  // Helper function to send messages to the active tab
  function sendMessageToActiveTab(message) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0] && tabs[0].url.includes('youtube.com')) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
  }
  
  // Check if we're on a YouTube page and update UI accordingly
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const status = document.querySelector('.status p');
    if (tabs[0] && tabs[0].url.includes('youtube.com')) {
      if (tabs[0].url.includes('/results') || tabs[0].url.includes('/search')) {
        status.textContent = '✅ Ready to sort videos by shortest first!';
        status.style.color = '#2e7d32';
      } else {
        status.textContent = '⚠️ Go to YouTube search results to sort videos';
        status.style.color = '#ff6d00';
      }
    } else {
      status.textContent = '❌ Not on YouTube. Open YouTube to use the sorter.';
      status.style.color = '#c62828';
      sortNowButton.disabled = true;
      sortNowButton.style.opacity = '0.5';
    }
  });
}); 