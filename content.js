
function isYouTubeSearchPage() {
    try {
      const urlObj = new URL(window.location.href);
      
      return urlObj.hostname.includes('youtube.com') && 
             (urlObj.pathname === '/results' || urlObj.pathname === '/search') &&
             urlObj.searchParams.has('search_query') &&
             !isYouTubeWatchPage();
    } catch (error) {
      return false;
    }
  }
  
  
  function isYouTubeWatchPage() {
  try {
    const urlObj = new URL(window.location.href);
      return urlObj.hostname.includes('youtube.com') && 
             urlObj.pathname === '/watch' &&
             urlObj.searchParams.has('v');
    } catch (error) {
      return false;
    }
  }
  
  
  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }
  
  
  function injectStyles() {
    
    const existingStyle = document.getElementById('yt-duration-sorter-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    
    const style = document.createElement('style');
    style.id = 'yt-duration-sorter-styles';
    style.textContent = `
      .yt-sort-indicator {
        position: fixed;
        top: 16px;
        right: 16px;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 13px;
        z-index: 9999;
        opacity: 0.9;
        transition: opacity 0.3s;
      }
    `;
    
    
    document.head.appendChild(style);
  }
  
  
  function safeRemoveElement(element) {
    try {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    } catch (error) {
      console.error('Error removing element:', error);
    }
  }
  
  
  function safeAppendElement(parent, child) {
    try {
      if (parent && child) {
        parent.appendChild(child);
      }
    } catch (error) {
      console.error('Error appending element:', error);
    }
  }
  
  
  const PERFORMANCE_CONFIG = {
    throttleDelay: 500,
    mobileLoadDelay: 2000,
    desktopLoadDelay: 1500,
    sortCheckDelay: 200,
    indicatorTimeout: 3000,
    indicatorFadeDelay: 1000
  };
  
  
  let cachedElements = {
    videoContainer: null,
    sortToggle: null,
    sortIndicator: null
  };
  
 
  function getVideoContainer() {
    if (cachedElements.videoContainer) {
      return cachedElements.videoContainer;
    }
    
    
    const containers = [
      '#contents.ytd-section-list-renderer',
      '#contents.ytd-item-section-renderer',
      'ytd-section-list-renderer #contents',
      '#primary #contents',
      'ytd-rich-grid-renderer #contents',
      
      '#contents ytd-rich-grid-row',
      '#contents ytd-rich-item-renderer',
      '#contents ytd-video-renderer',
      '#contents ytd-compact-video-renderer'
    ];
    
    
    for (const selector of containers) {
      const container = document.querySelector(selector);
      if (container) {
        cachedElements.videoContainer = container;
        return container;
      }
    }
    
    return null;
  }
  

  function clearCachedElements() {
    cachedElements = {
      videoContainer: null,
      sortToggle: null,
      sortIndicator: null
    };
  }
  
 
  function convertTimeToSeconds(timeString) {
    if (!timeString) return 999999;
    
    const parts = timeString.split(':').map(part => parseInt(part.trim(), 10));
    
    if (parts.length === 3) {
      
      return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    } else if (parts.length === 2) {
      
      return (parts[0] * 60) + parts[1];
    } else if (parts.length === 1) {
      
      return parts[0];
    }
    
    return 999999;
  }
  
 
  function sortVideosByDuration() {
    console.log('Starting minimal video sorting');
    
    if (window.isSorting) {
      return;
    }

    window.isSorting = true;
    
    try {
      
      const container = document.querySelector('#contents.ytd-item-section-renderer');
      if (!container) {
        window.isSorting = false;
        return;
      }
      
      
      const videoItems = Array.from(container.querySelectorAll('ytd-video-renderer'));
      
      if (videoItems.length <= 1) {
        window.isSorting = false;
        return;
      }
      
      console.log(`Found ${videoItems.length} videos to sort`);
      
      
      const processedVideos = [];
      const uniqueVideos = new Set(); 
      
      videoItems.forEach(video => {
        // Extract information
        const timeElement = video.querySelector('span.ytd-thumbnail-overlay-time-status-renderer');
        const timeText = timeElement ? timeElement.textContent.trim() : null;
        const titleElement = video.querySelector('#video-title');
        const title = titleElement ? titleElement.textContent.trim() : '';
        const duration = timeText ? convertTimeToSeconds(timeText) : 999999;
        
        
        const videoKey = `${title}-${timeText}`;
        
        
        if (!uniqueVideos.has(videoKey)) {
          uniqueVideos.add(videoKey);
          processedVideos.push({
            element: video,
            duration: duration,
            title: title,
            key: videoKey
          });
        } else {
          console.log(`Skipping duplicate video: ${title}`);
        }
      });
      
      console.log(`Processing ${processedVideos.length} unique videos after removing duplicates`);
      
      
      processedVideos.sort((a, b) => a.duration - b.duration);
      
      
      const fragment = document.createDocumentFragment();
      
      
      processedVideos.forEach(item => {
        fragment.appendChild(item.element);
      });
      
      
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      
      
      container.appendChild(fragment);
      
      
      const indicator = document.createElement('div');
      indicator.className = 'yt-sort-indicator';
      indicator.textContent = `Videos sorted: ${processedVideos.length} unique videos by shortest first`;
      document.body.appendChild(indicator);
      
      setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => {
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, 300);
      }, 2000);
      
      window.isSorting = false;
  } catch (error) {
      console.error('Error in minimal video sorting:', error);
      window.isSorting = false;
    }
  }
  
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'sortNow') {
      if (isYouTubeSearchPage()) {
        sortVideosByDuration();
      }
    }
  });
  
  
  function handleUrlChange() {
    if (isYouTubeSearchPage()) {
      // Wait for content to load
      setTimeout(sortVideosByDuration, 1500);
    }
  }
  
 
  injectStyles();
  handleUrlChange();
  
   
  let lastUrl = window.location.href;
  const urlChangeObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      handleUrlChange();
    }
  });
  
  // Start observing for URL changes
  urlChangeObserver.observe(document, { 
    subtree: true, 
    childList: true
  });