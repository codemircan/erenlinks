// Configuration constants
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_OPENING') {
    processBatches(message.urls);
  }
});

async function processBatches(urls) {
  const total = urls.length;
  let opened = 0;

  while (opened < total) {
    const batch = urls.slice(opened, opened + BATCH_SIZE);

    // Create tabs in the current batch
    const promises = batch.map(async (url) => {
      try {
        // Step 1: Create a tab with about:blank to minimize resource usage immediately.
        const tab = await chrome.tabs.create({
          url: 'about:blank',
          active: false
        });

        // Step 2: Update the tab to the target URL.
        await chrome.tabs.update(tab.id, { url });

        // Step 3: Immediately discard it.
        // This keeps the tab in the bar but prevents it from loading the content into RAM.
        await chrome.tabs.discard(tab.id);

        return tab;
      } catch (e) {
        console.error('Error opening tab:', e);
      }
    });

    await Promise.all(promises);

    opened += batch.length;

    // Notify the popup about progress
    chrome.runtime.sendMessage({
      type: 'PROGRESS_UPDATE',
      opened,
      total
    }).catch(() => {
      // Popup might have been closed, which is fine
    });

    if (opened < total) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // Notify completion
  chrome.runtime.sendMessage({
    type: 'FINISHED',
    total
  }).catch(() => {
    // Popup might have been closed
  });
}
