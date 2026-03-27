document.getElementById('playBtn').addEventListener('click', function() {
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: chrome.runtime.getURL('game.html') });
  } else {
    window.open('game.html', '_blank');
  }
});
