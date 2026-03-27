// Fix back link for Chrome extension context
var backLink = document.getElementById('backLink');
if (backLink) {
  backLink.addEventListener('click', function(e) {
    e.preventDefault();
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      window.location.href = chrome.runtime.getURL('index.html');
    } else {
      window.location.href = 'index.html';
    }
  });
}
