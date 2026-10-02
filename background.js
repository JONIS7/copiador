chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'copiador:paste' || sender.tab?.id === undefined) return;

  const tabId = sender.tab.id;
  chrome.webNavigation.getAllFrames({ tabId }, (frames) => {
    if (chrome.runtime.lastError || !frames) {
      sendResponse({ pastedCount: 0 });
      return;
    }

    Promise.all(frames.map(frame => new Promise(resolve => {
      chrome.tabs.sendMessage(tabId, {
        type: 'copiador:paste-frame',
        data: message.data
      }, { frameId: frame.frameId }, response => {
        void chrome.runtime.lastError;
        resolve(response?.pastedCount || 0);
      });
    }))).then(counts => {
      sendResponse({ pastedCount: counts.reduce((total, count) => total + count, 0) });
    });
  });

  return true;
});