// AladdinGenie MV3 Service Worker - Hardware 60fps TabCapture + 1:1 PNG Screenshot
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'ALADDIN_GET_TAB_STREAM_ID') {
    try {
      const tabId = sender && sender.tab && typeof sender.tab.id === 'number' ? sender.tab.id : null;
      if (!tabId || !chrome.tabCapture || typeof chrome.tabCapture.getMediaStreamId !== 'function') {
        sendResponse({ ok: false, error: 'tabCapture_unavailable' });
        return;
      }
      chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
        if (chrome.runtime.lastError || !streamId) {
          sendResponse({
            ok: false,
            error: chrome.runtime.lastError ? chrome.runtime.lastError.message : 'stream_id_failed',
          });
        } else {
          sendResponse({ ok: true, streamId });
        }
      });
      return true;
    } catch (err) {
      sendResponse({ ok: false, error: err && err.message ? err.message : 'tabCapture_error' });
      return;
    }
  }

  const isPngSnap = msg.type === 'ALADDIN_CAPTURE_TAB';
  if (isPngSnap) {
    try {
      const winId =
        sender && sender.tab && typeof sender.tab.windowId === 'number'
          ? sender.tab.windowId
          : null;
      const handleCapture = (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          sendResponse({
            ok: false,
            error: chrome.runtime.lastError
              ? chrome.runtime.lastError.message
              : 'capture_failed',
          });
        } else {
          sendResponse({ ok: true, dataUrl });
        }
      };
      if (typeof winId === 'number') {
        chrome.tabs.captureVisibleTab(winId, { format: 'png' }, handleCapture);
      } else {
        chrome.tabs.captureVisibleTab({ format: 'png' }, handleCapture);
      }
    } catch (err) {
      sendResponse({
        ok: false,
        error: err && err.message ? err.message : 'capture_error',
      });
    }
    return true;
  }
});
