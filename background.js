
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Short Stack extension installed');
});


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
    
    chrome.action.enable(tabId);
  } else if (changeInfo.status === 'complete' && tab.url && !tab.url.includes('youtube.com')) {
   
    chrome.action.disable(tabId);
  }
});