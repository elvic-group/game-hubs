document.getElementById('playBtn').addEventListener('click', function() {
  if (typeof chrome !== 'undefined' && chrome.tabs && typeof chrome.tabs.create === 'function') {
    chrome.tabs.create({ url: chrome.runtime.getURL('minesweeper/game.html') });
  } else {
    window.open('game.html', '_blank');
  }
});

document.getElementById('hubBtn').addEventListener('click', function() {
  if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  } else {
    window.open('../index.html', '_blank');
  }
});
