console.log('[Content] Sync content script loaded');

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    console.log('[Content] Page is visible');
  }
});
