console.log('YouTube Duration Sorter extension loaded');

chrome.runtime.sendMessage({action: 'isExtensionActive'}, response => {
  if (chrome.runtime.lastError) {
    console.error('Extension communication error:', chrome.runtime.lastError);
  } else {
    console.log('Extension is active:', response);
  }
});

function isYouTubeSearchPage() {
  try {
    const urlObj = new URL(window.location.href);
    return urlObj.hostname.includes('youtube.com') && 
           (urlObj.pathname === '/results' || urlObj.pathname === '/search') &&
           urlObj.searchParams.has('search_query') &&
           !isYouTubeWatchPage();
  } catch (error) {
    console.error('Error in isYouTubeSearchPage:', error);
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
    console.error('Error in isYouTubeWatchPage:', error);
    return false;
  }
}

function isMobileDevice() {
  try {
    const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isMobileYouTubeDomain = window.location.hostname.includes('m.youtube.com');
    const hasSmallViewport = window.innerWidth <= 768;
    const hasMobileElements = !!document.querySelector('ytm-app, .mobile-topbar-header-content, mobile-topbar');
    console.log('Mobile detection:', { 
      mobileUserAgent, 
      isMobileYouTubeDomain, 
      hasSmallViewport, 
      hasMobileElements 
    });
    return mobileUserAgent || isMobileYouTubeDomain || hasSmallViewport || hasMobileElements;
  } catch (error) {
    console.error('Error in isMobileDevice:', error);
    return false;
  }
}

function injectStyles() {
  try {
    console.log('Injecting styles...');
    const existingStyle = document.getElementById('yt-duration-sorter-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    const isDarkMode = document.documentElement.getAttribute('dark') === 'true' || 
                       document.body.classList.contains('dark-theme') ||
                       window.matchMedia('(prefers-color-scheme: dark)').matches;
    const style = document.createElement('style');
    style.id = 'yt-duration-sorter-styles';
    style.textContent = `
      .yt-sort-indicator {
        position: fixed;
        top: 16px;
        right: 16px;
        background-color: ${isDarkMode ? 'rgba(33, 33, 33, 0.9)' : 'rgba(0, 0, 0, 0.8)'};
        color: ${isDarkMode ? '#f1f1f1' : 'white'};
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 13px;
        z-index: 9999;
        opacity: 0.9;
        transition: opacity 0.3s;
      }
      html[dark="true"] #yt-duration-sort-toggle,
      .dark-theme #yt-duration-sort-toggle {
        color: #f1f1f1 !important;
      }
      #yt-duration-sort-toggle[data-sort-state="asc"],
      #yt-duration-sort-toggle[data-sort-state="desc"] {
        background-color: ${isDarkMode ? 'rgba(33, 33, 33, 0.9)' : 'rgba(0, 0, 0, 0.05)'};
        color: #3ea6ff !important;
        border-color: #3ea6ff;
      }
      @media (max-width: 768px) {
        .yt-sort-indicator {
          top: 10px;
          right: 10px;
          font-size: 12px;
          padding: 5px 8px;
        }
        #yt-duration-sort-toggle {
          margin: 6px;
          padding: 5px 8px;
          font-size: 12px;
        }
      }
    `;
    document.head.appendChild(style);
    console.log('Styles injected successfully');
  } catch (error) {
    console.error('Error injecting styles:', error);
  }
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
  mobileLoadDelay: 2500,
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
  try {
    console.log('Getting video container...');
    if (cachedElements.videoContainer) {
      return cachedElements.videoContainer;
    }
    const mobileContainers = [
      'ytm-section-list-renderer',
      'ytm-rich-grid-renderer',
      'ytm-item-section-renderer',
      '.scbrr-tabs #contents',
      'ytm-search'
    ];
    const desktopContainers = [
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
    const containers = isMobileDevice() 
      ? [...mobileContainers, ...desktopContainers]
      : [...desktopContainers, ...mobileContainers];
    for (const selector of containers) {
      const container = document.querySelector(selector);
      if (container) {
        console.log('Found container with selector:', selector);
        cachedElements.videoContainer = container;
        return container;
      }
    }
    console.error('No video container found');
    return null;
  } catch (error) {
    console.error('Error getting video container:', error);
    return null;
  }
}

function clearCachedElements() {
  cachedElements = {
    videoContainer: null,
    sortToggle: null,
    sortIndicator: null
  };
}

function convertTimeToSeconds(timeString) {
  try {
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
  } catch (error) {
    console.error('Error converting time to seconds:', error, 'from timeString:', timeString);
    return 999999;
  }
}

function sortVideosByDuration() {
  console.log('Starting minimal video sorting');
  if (window.isSorting) {
    console.log('Already sorting, aborting');
    return;
  }
  window.isSorting = true;
  try {
    const containerSelectors = isMobileDevice() ? [
      'ytm-section-list-renderer',
      'ytm-rich-grid-renderer',
      'ytm-item-section-renderer',
      '.scbrr-tabs #contents',
      'ytm-search'
    ] : [
      '#contents.ytd-item-section-renderer',
      '#contents.ytd-rich-grid-renderer',
      'ytd-section-list-renderer #contents',
      '#primary #contents'
    ];
    let container = null;
    let videoItems = [];
    for (const selector of containerSelectors) {
      container = document.querySelector(selector);
      if (container) {
        const itemSelectors = isMobileDevice() ? [
          'ytm-video-with-context-renderer',
          'ytm-compact-video-renderer',
          'ytm-item-section-renderer ytm-compact-video-renderer',
          '.compact-media-item'
        ] : [
          'ytd-video-renderer',
          'ytd-rich-item-renderer',
          'ytd-grid-video-renderer',
          'ytd-compact-video-renderer'
        ];
        for (const itemSelector of itemSelectors) {
          const items = container.querySelectorAll(itemSelector);
          if (items && items.length > 0) {
            videoItems = Array.from(items);
            console.log(`Found ${videoItems.length} videos with selector ${itemSelector} in container ${selector}`);
            break;
          }
        }
        if (videoItems.length > 0) {
          break;
        }
      }
    }
    if (!container || videoItems.length <= 1) {
      console.error('No suitable container or not enough videos found for sorting');
      window.isSorting = false;
      return;
    }
    console.log(`Found ${videoItems.length} videos to sort`);
    const isOnForYouTab = isForYouTab();
    console.log('Is on For You tab:', isOnForYouTab);
    const searchQuery = getSearchQuery();
    console.log('Search query:', searchQuery);
    const processedVideos = [];
    const uniqueVideos = new Set(); 
    let hiddenCount = 0;
    videoItems.forEach(video => {
      try {
        const timeSelectors = isMobileDevice() ? [
          '.ytm-thumbnail-overlay-time-status-renderer',
          '.time-status',
          '.ytm-video-with-context-renderer .time-status',
          '.compact-media-item-metadata .time-status'
        ] : [
          'span.ytd-thumbnail-overlay-time-status-renderer',
          '#text.ytd-thumbnail-overlay-time-status-renderer',
          '.ytp-time-duration',
          '.ytd-thumbnail-overlay-time-status-renderer'
        ];
        let timeElement = null;
        let timeText = null;
        for (const selector of timeSelectors) {
          timeElement = video.querySelector(selector);
          if (timeElement) {
            timeText = timeElement.textContent.trim();
            if (timeText) break;
          }
        }
        const titleSelectors = isMobileDevice() ? [
          '.compact-media-item-headline',
          '.media-item-headline',
          '.ytm-video-with-context-renderer h3',
          'h3.media-item-headline'
        ] : [
          '#video-title',
          '.title',
          'h3',
          'a.yt-simple-endpoint'
        ];
        let titleElement = null;
        let title = '';
        for (const selector of titleSelectors) {
          titleElement = video.querySelector(selector);
          if (titleElement) {
            title = titleElement.textContent.trim();
            if (title) break;
          }
        }
        const duration = timeText ? convertTimeToSeconds(timeText) : 999999;
        const isRelated = !isOnForYouTab || isVideoRelatedToSearch(title, searchQuery);
        const videoKey = `${title}_${duration}`;
        if (!uniqueVideos.has(videoKey)) {
          uniqueVideos.add(videoKey);
          if (isRelated) {
            processedVideos.push({
              element: video,
              duration: duration,
              title: title,
              timeText: timeText,
              isRelated: isRelated
            });
          } else {
            video.style.display = 'none';
            hiddenCount++;
          }
        }
      } catch (error) {
        console.error('Error processing video item:', error);
      }
    });
    console.log(`Processing ${processedVideos.length} unique videos, hidden ${hiddenCount} unrelated videos`);
    const sortToggle = cachedElements.sortToggle || document.getElementById('yt-duration-sort-toggle');
    const currentSortState = sortToggle ? sortToggle.getAttribute('data-sort-state') : 'none';
    let newSortState;
    if (currentSortState === 'none' || currentSortState === 'desc') {
      newSortState = 'asc';
    } else {
      newSortState = 'desc';
    }
    processedVideos.sort((a, b) => {
      if (newSortState === 'asc') {
        return a.duration - b.duration;
      } else {
        return b.duration - a.duration;
      }
    });
    console.log(`Sorted videos in ${newSortState} order:`, processedVideos.map(v => `${v.title} (${v.timeText}): ${v.duration}s`));
    finishSorting(processedVideos, container, newSortState);
  } catch (error) {
    console.error('Error during video sorting:', error);
    window.isSorting = false;
  }
}

function finishSorting(sortedVideos, container, sortState) {
  try {
    console.log('Finishing sorting...');
    showSortIndicator(sortState);
    const sortToggle = cachedElements.sortToggle || document.getElementById('yt-duration-sort-toggle');
    if (sortToggle) {
      sortToggle.setAttribute('data-sort-state', sortState);
      const iconElement = sortToggle.querySelector('span');
      if (iconElement) {
        if (sortState === 'asc') {
          iconElement.textContent = '⏱️ ↑';
        } else {
          iconElement.textContent = '⏱️ ↓';
        }
      }
    }
    sortedVideos.forEach(item => {
      if (item.element && item.element.parentNode === container) {
        container.removeChild(item.element);
      }
    });
    sortedVideos.forEach(item => {
      if (item.element) {
        container.appendChild(item.element);
      }
    });
    console.log('Sorting completed successfully');
    setTimeout(() => {
      window.isSorting = false;
    }, 500);
  } catch (error) {
    console.error('Error in finishSorting:', error);
    window.isSorting = false;
  }
}

function showSortIndicator(sortState) {
  try {
    console.log('Showing sort indicator...');
    const existingIndicator = cachedElements.sortIndicator || document.querySelector('.yt-sort-indicator');
    if (existingIndicator) {
      safeRemoveElement(existingIndicator);
    }
    const hiddenVideos = Array.from(document.querySelectorAll('[style*="display: none"]')).length;
    const indicator = document.createElement('div');
    indicator.className = 'yt-sort-indicator';
    let message = sortState === 'asc' ? 'Sorted by Duration (Shortest First)' : 'Sorted by Duration (Longest First)';
    if (hiddenCount > 0) {
      message += ` | Filtered out ${hiddenCount} unrelated videos`;
    }
    indicator.textContent = message;
    if (isMobileDevice()) {
      indicator.style.cssText = `
        top: ${window.scrollY + 10}px;
        right: 10px;
        font-size: 12px;
        padding: 8px;
        z-index: 99999;
      `;
    }
    document.body.appendChild(indicator);
    cachedElements.sortIndicator = indicator;
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.style.opacity = '0';
        setTimeout(() => {
          safeRemoveElement(indicator);
          cachedElements.sortIndicator = null;
        }, PERFORMANCE_CONFIG.indicatorFadeDelay);
      }
    }, PERFORMANCE_CONFIG.indicatorTimeout);
  } catch (error) {
    console.error('Error showing sort indicator:', error);
  }
}

function isForYouTab() {
  try {
    const forYouChip = Array.from(document.querySelectorAll('yt-chip-cloud-chip-renderer')).find(
      chip => chip.textContent.trim().toLowerCase() === 'for you' && 
              chip.hasAttribute('selected')
    );
    return !!forYouChip;
  } catch (error) {
    console.error('Error checking if on For You tab:', error);
    return false;
  }
}

function getSearchQuery() {
  try {
    const urlObj = new URL(window.location.href);
    return urlObj.searchParams.get('search_query') || '';
  } catch (error) {
    console.error('Error getting search query:', error);
    return '';
  }
}

function isVideoRelatedToSearch(videoTitle, searchQuery) {
  if (!searchQuery) return true;
  const titleLower = videoTitle.toLowerCase();
  const queryTerms = searchQuery.toLowerCase().split(/\s+/).filter(term => term.length > 2);
  if (queryTerms.length === 0) return true;
  return queryTerms.some(term => titleLower.includes(term));
}

function addSortToggle() {
  try {
    console.log('Adding sort toggle...');
    if (document.getElementById('yt-duration-sort-toggle')) {
      console.log('Sort toggle already exists');
      return;
    }
    let filterBar = null;
    if (isMobileDevice()) {
      const mobileSelectors = [
        'ytm-search-filter-renderer',
        '.filter-chip-bar-renderer',
        '.scbrr-tabs',
        'ytm-item-section-renderer > div'
      ];
      for (const selector of mobileSelectors) {
        filterBar = document.querySelector(selector);
        if (filterBar) break;
      }
    } else {
      filterBar = document.querySelector('ytd-search-sub-menu-renderer #container');
    }
    if (!filterBar) {
      console.error('Filter bar not found');
      filterBar = document.querySelector('#masthead, .mobile-topbar-header-content, ytm-mobile-topbar-renderer');
      if (!filterBar) {
        console.error('Could not find any suitable location for sort button');
        return;
      }
    }
    const isDarkMode = document.documentElement.getAttribute('dark') === 'true' || 
                       document.body.classList.contains('dark-theme') ||
                       window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log('YouTube dark mode detected:', isDarkMode);
    const toggleButton = document.createElement('button');
    toggleButton.id = 'yt-duration-sort-toggle';
    toggleButton.setAttribute('data-sort-state', 'none');
    if (isMobileDevice()) {
      toggleButton.style.cssText = `
        background: transparent;
        border: 1px solid #ccc;
        border-radius: 18px;
        padding: 6px 10px;
        margin: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        font-family: 'Roboto', sans-serif;
        font-size: 13px;
        color: ${isDarkMode ? '#f1f1f1' : '#606060'};
        position: relative;
        z-index: 1000;
      `;
    } else {
      toggleButton.style.cssText = `
        background: transparent;
        border: 1px solid #ccc;
        border-radius: 18px;
        padding: 6px 12px;
        margin-left: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        font-family: 'Roboto', sans-serif;
        font-size: 14px;
        color: ${isDarkMode ? '#f1f1f1' : '#606060'};
      `;
    }
    toggleButton.innerHTML = '<span style="margin-right: 4px;">⏱️</span> Sort by Duration';
    toggleButton.addEventListener('click', sortVideosByDuration);
    if (isMobileDevice() && filterBar.tagName === 'YTM-SEARCH-FILTER-RENDERER') {
      filterBar.parentNode.insertBefore(toggleButton, filterBar.nextSibling);
    } else {
      filterBar.appendChild(toggleButton);
    }
    cachedElements.sortToggle = toggleButton;
    console.log('Sort toggle added successfully');
  } catch (error) {
    console.error('Error adding sort toggle:', error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    console.log('Received message:', message);
    if (message.action === 'sortNow') {
      if (isYouTubeSearchPage()) {
        sortVideosByDuration();
        sendResponse({status: 'success'});
      } else {
        sendResponse({status: 'error', message: 'Not on a YouTube search page'});
      }
    } else if (message.action === 'isExtensionActive') {
      sendResponse({status: 'active'});
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({status: 'error', message: error.toString()});
  }
  return true;
});

function handleUrlChange() {
  try {
    console.log('Handling URL change:', window.location.href);
    clearCachedElements();
    if (isYouTubeSearchPage()) {
      console.log('On YouTube search page, adding sort toggle');
      setTimeout(addSortToggle, isMobileDevice() ? PERFORMANCE_CONFIG.mobileLoadDelay : PERFORMANCE_CONFIG.desktopLoadDelay);
    }
  } catch (error) {
    console.error('Error handling URL change:', error);
  }
}

function initializeExtension() {
  console.log('Initializing extension...');
  injectStyles();
  handleUrlChange();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  try {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('URL changed to:', lastUrl);
      handleUrlChange();
    }
  } catch (error) {
    console.error('Error in URL observer:', error);
  }
});
observer.observe(document, { subtree: true, childList: true });
