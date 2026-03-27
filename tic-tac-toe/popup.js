document.getElementById('playBtn').addEventListener('click', function(e) {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL('game.html') });
});
