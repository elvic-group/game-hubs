function openGame(path) {
  chrome.tabs.create({ url: chrome.runtime.getURL(path) });
}
document.getElementById('snakeBtn').addEventListener('click', function() { openGame('snake/game.html'); });
document.getElementById('tttBtn').addEventListener('click', function() { openGame('tic-tac-toe/game.html'); });
document.getElementById('pongBtn').addEventListener('click', function() { openGame('ping-pong/game.html'); });
document.getElementById('tetrisBtn').addEventListener('click', function() { openGame('tetris/game.html'); });
document.getElementById('breakoutBtn').addEventListener('click', function() { openGame('breakout/game.html'); });
document.getElementById('flappyBtn').addEventListener('click', function() { openGame('flappy-bird/game.html'); });
document.getElementById('2048Btn').addEventListener('click', function() { openGame('2048/game.html'); });
document.getElementById('minesBtn').addEventListener('click', function() { openGame('minesweeper/game.html'); });
document.getElementById('hubBtn').addEventListener('click', function() { openGame('index.html'); });
