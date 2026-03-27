document.getElementById('playBtn').addEventListener('click', function() {
  chrome.tabs.create({ url: chrome.runtime.getURL('game.html') });
});
