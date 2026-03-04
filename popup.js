const openBtn = document.getElementById('open-btn');
const freezeBtn = document.getElementById('freeze-btn');
const urlListTextarea = document.getElementById('url-list');
const progressStatus = document.getElementById('progress-status');

// Listen for progress updates from the background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PROGRESS_UPDATE') {
    updateStatus(`Processing: ${message.opened}/${message.total}`);
  } else if (message.type === 'FINISHED') {
    updateStatus(`Finished! Opened ${message.total} tabs.`);
    openBtn.disabled = false;
  }
});

openBtn.addEventListener('click', async () => {
  const text = urlListTextarea.value;
  const urls = text.split('\n')
    .map(url => url.trim())
    .filter(url => url.length > 0);

  if (urls.length === 0) {
    updateStatus('Please enter at least one URL.');
    return;
  }

  openBtn.disabled = true;
  updateStatus(`Starting to open ${urls.length} tabs...`);

  // Send the URLs to the background worker to handle the batching
  chrome.runtime.sendMessage({ type: 'START_OPENING', urls });
});

freezeBtn.addEventListener('click', async () => {
  const currentWindow = await chrome.windows.getCurrent();
  const tabs = await chrome.tabs.query({ windowId: currentWindow.id });

  let discardedCount = 0;
  for (const tab of tabs) {
    // Only discard if not active and not pinned
    if (!tab.active && !tab.pinned && !tab.discarded) {
      try {
        await chrome.tabs.discard(tab.id);
        discardedCount++;
      } catch (e) {
        console.error('Failed to discard tab:', e);
      }
    }
  }
  updateStatus(`Frozen ${discardedCount} tabs.`);
});

function updateStatus(message) {
  progressStatus.textContent = message;
}
