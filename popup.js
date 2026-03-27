function openGame(path) {
  chrome.tabs.create({ url: chrome.runtime.getURL(path) });
}
document.getElementById('snakeBtn').addEventListener('click', function() { openGame('snake/game.html'); });
document.getElementById('tttBtn').addEventListener('click', function() { openGame('tic-tac-toe/game.html'); });
document.getElementById('pongBtn').addEventListener('click', function() { openGame('ping-pong/game.html'); });
document.getElementById('hubBtn').addEventListener('click', function() { openGame('index.html'); });
