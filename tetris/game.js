// ============ AUDIO ENGINE ============
const AudioEngine = (() => {
  let ctx, enabled = true;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function play(freq, type, duration, vol = 0.15) {
    if (!enabled) return;
    const c = getCtx(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    o.start(); o.stop(c.currentTime + duration);
  }
  return {
    set enabled(v) { enabled = v; },
    get enabled() { return enabled; },
    move() { play(200, 'sine', 0.05, 0.05); },
    rotate() { play(400, 'sine', 0.08, 0.1); },
    drop() { play(150, 'triangle', 0.12, 0.12); },
    lock() { play(250, 'square', 0.06, 0.08); },
    clear() { play(600, 'sine', 0.1, 0.12); setTimeout(() => play(800, 'sine', 0.1, 0.12), 60); },
    tetris() { play(500, 'square', 0.08, 0.1); setTimeout(() => play(700, 'square', 0.08, 0.1), 60); setTimeout(() => play(900, 'square', 0.08, 0.1), 120); setTimeout(() => play(1100, 'square', 0.15, 0.12), 180); },
    levelUp() { play(440, 'sine', 0.1, 0.1); setTimeout(() => play(660, 'sine', 0.1, 0.1), 80); setTimeout(() => play(880, 'sine', 0.15, 0.12), 160); },
    die() { play(200, 'sawtooth', 0.3, 0.12); setTimeout(() => play(100, 'sawtooth', 0.4, 0.1), 100); },
    countdown() { play(440, 'sine', 0.15, 0.1); },
    countdownGo() { play(880, 'sine', 0.25, 0.15); },
  };
})();

// ============ CONSTANTS ============
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 28;

// Tetromino shapes and colors
const PIECES = {
  I: { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#00f0f0' },
  O: { shape: [[1,1],[1,1]], color: '#f0f000' },
  T: { shape: [[0,1,0],[1,1,1],[0,0,0]], color: '#a000f0' },
  S: { shape: [[0,1,1],[1,1,0],[0,0,0]], color: '#00f000' },
  Z: { shape: [[1,1,0],[0,1,1],[0,0,0]], color: '#f00000' },
  J: { shape: [[1,0,0],[1,1,1],[0,0,0]], color: '#0000f0' },
  L: { shape: [[0,0,1],[1,1,1],[0,0,0]], color: '#f0a000' },
};

const PIECE_NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const LINE_SCORES = [0, 100, 300, 500, 800];

// ============ CANVAS SETUP ============
const canvas = document.getElementById('gameCanvas');
const ctx2d = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

// ============ GAME STATE ============
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let paused = false;
let dropTimer = null;
let lastDropTime = 0;
let animationId = null;
let countdownInterval = null;
let difficulty = 'normal';
let highScore = parseInt(localStorage.getItem('tetrisHighScore') || '0');
let shakeTimer = 0;
let shakeIntensity = 0;
let clearingLines = [];
let clearAnimTimer = 0;
let bag = [];

const baseSpeeds = { easy: 900, normal: 700, hard: 450 };
const speedFactors = { easy: 0.85, normal: 0.78, hard: 0.70 };

// ============ UI REFERENCES ============
const menuEl = document.getElementById('menu');
const hudEl = document.getElementById('hud');
const gameAreaEl = document.getElementById('gameArea');
const pauseEl = document.getElementById('pauseOverlay');
const deathEl = document.getElementById('deathOverlay');
const countdownEl = document.getElementById('countdown');
const scoreVal = document.getElementById('scoreVal');
const levelVal = document.getElementById('levelVal');
const linesVal = document.getElementById('linesVal');
const highVal = document.getElementById('highVal');
const finalScoreEl = document.getElementById('finalScore');
const newHighLabel = document.getElementById('newHighLabel');
const menuHighScore = document.getElementById('menuHighScore');
const sideScore = document.getElementById('sideScore');
const sideLevel = document.getElementById('sideLevel');
const sideLines = document.getElementById('sideLines');

menuHighScore.textContent = highScore;
highVal.textContent = highScore;

// ============ MENU LOGIC ============
document.querySelectorAll('.diff-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelector('.diff-btn.active').classList.remove('active');
    btn.classList.add('active');
    difficulty = btn.dataset.diff;
  });
});

document.getElementById('soundToggle').addEventListener('click', function() {
  this.classList.toggle('on');
  AudioEngine.enabled = this.classList.contains('on');
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('retryBtn').addEventListener('click', startGame);
document.getElementById('menuBtn').addEventListener('click', showMenu);
document.getElementById('resumeBtn').addEventListener('click', resumeGame);
document.getElementById('quitBtn').addEventListener('click', showMenu);

document.getElementById('infoBtn').addEventListener('click', function() {
  menuEl.style.display = 'none';
  document.getElementById('infoOverlay').style.display = 'flex';
});
document.getElementById('infoCloseBtn').addEventListener('click', function() {
  document.getElementById('infoOverlay').style.display = 'none';
  menuEl.style.display = 'flex';
});

// Back to Game Hubs button
document.getElementById('backToHubBtn').addEventListener('click', function() {
  if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
    window.location.href = chrome.runtime.getURL('index.html');
  } else {
    window.location.href = '../index.html';
  }
});

function showMenu() {
  cancelAnimationFrame(animationId);
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  countdownEl.style.display = 'none';
  menuEl.style.display = 'flex';
  hudEl.style.display = 'none';
  gameAreaEl.style.display = 'none';
  pauseEl.style.display = 'none';
  deathEl.style.display = 'none';
  menuHighScore.textContent = highScore;
}

// ============ PIECE BAG (7-bag randomizer) ============
function fillBag() {
  bag = PIECE_NAMES.slice();
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    var tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp;
  }
}

function getNextPieceName() {
  if (bag.length === 0) fillBag();
  return bag.pop();
}

function createPiece(name) {
  var p = PIECES[name];
  var shape = p.shape.map(function(row) { return row.slice(); });
  return {
    name: name,
    shape: shape,
    color: p.color,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0
  };
}

// ============ BOARD OPERATIONS ============
function createBoard() {
  var b = [];
  for (var r = 0; r < ROWS; r++) {
    b[r] = [];
    for (var c = 0; c < COLS; c++) {
      b[r][c] = 0;
    }
  }
  return b;
}

function isValid(piece, boardRef) {
  var shape = piece.shape;
  for (var r = 0; r < shape.length; r++) {
    for (var c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        var nx = piece.x + c;
        var ny = piece.y + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
        if (ny >= 0 && boardRef[ny][nx]) return false;
      }
    }
  }
  return true;
}

function rotatePiece(piece) {
  var shape = piece.shape;
  var n = shape.length;
  var rotated = [];
  for (var r = 0; r < n; r++) {
    rotated[r] = [];
    for (var c = 0; c < n; c++) {
      rotated[r][c] = shape[n - 1 - c][r];
    }
  }
  return rotated;
}

function lockPiece() {
  var shape = currentPiece.shape;
  for (var r = 0; r < shape.length; r++) {
    for (var c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        var ny = currentPiece.y + r;
        var nx = currentPiece.x + c;
        if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
          board[ny][nx] = currentPiece.color;
        }
      }
    }
  }
  AudioEngine.lock();
  checkLines();
  spawnPiece();
}

function checkLines() {
  clearingLines = [];
  for (var r = ROWS - 1; r >= 0; r--) {
    var full = true;
    for (var c = 0; c < COLS; c++) {
      if (!board[r][c]) { full = false; break; }
    }
    if (full) clearingLines.push(r);
  }

  if (clearingLines.length > 0) {
    var pts = LINE_SCORES[clearingLines.length] * level;
    score += pts;
    lines += clearingLines.length;
    var newLevel = Math.floor(lines / 10) + 1;

    if (clearingLines.length === 4) {
      AudioEngine.tetris();
      shakeTimer = 200;
      shakeIntensity = 5;
    } else {
      AudioEngine.clear();
    }

    if (newLevel > level) {
      level = newLevel;
      AudioEngine.levelUp();
    }

    // Remove cleared lines
    clearingLines.sort(function(a, b) { return a - b; });
    for (var i = clearingLines.length - 1; i >= 0; i--) {
      board.splice(clearingLines[i], 1);
    }
    for (var i = 0; i < clearingLines.length; i++) {
      var emptyRow = [];
      for (var c = 0; c < COLS; c++) emptyRow.push(0);
      board.unshift(emptyRow);
    }

    updateHUD();
  }
}

function spawnPiece() {
  currentPiece = createPiece(nextPiece.name);
  nextPiece = createPiece(getNextPieceName());

  if (!isValid(currentPiece, board)) {
    gameOver = true;
    shakeTimer = 300;
    shakeIntensity = 8;
    AudioEngine.die();

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('tetrisHighScore', highScore.toString());
    }

    setTimeout(function() {
      deathEl.style.display = 'flex';
      finalScoreEl.textContent = score;
      if (score >= highScore && score > 0) {
        newHighLabel.style.display = 'block';
      } else {
        newHighLabel.style.display = 'none';
      }
    }, 500);
  }
}

function getDropInterval() {
  var base = baseSpeeds[difficulty];
  var factor = speedFactors[difficulty];
  return Math.max(50, base * Math.pow(factor, level - 1));
}

function getGhostPosition() {
  var ghost = {
    shape: currentPiece.shape,
    color: currentPiece.color,
    x: currentPiece.x,
    y: currentPiece.y,
    name: currentPiece.name
  };
  while (isValid({ shape: ghost.shape, color: ghost.color, x: ghost.x, y: ghost.y + 1, name: ghost.name }, board)) {
    ghost.y++;
  }
  return ghost;
}

// ============ HUD UPDATE ============
function updateHUD() {
  scoreVal.textContent = score;
  levelVal.textContent = level;
  linesVal.textContent = lines;
  highVal.textContent = Math.max(score, highScore);
  sideScore.textContent = score;
  sideLevel.textContent = level;
  sideLines.textContent = lines;
}

// ============ DRAWING ============
function drawBlock(context, x, y, color, size, ghost) {
  if (ghost) {
    context.strokeStyle = color;
    context.lineWidth = 1.5;
    context.globalAlpha = 0.3;
    context.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
    context.globalAlpha = 1;
    return;
  }
  // Main block
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);

  // Highlight (top-left shine)
  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, (size - 2) / 3);

  // Shadow (bottom)
  context.fillStyle = 'rgba(0,0,0,0.2)';
  context.fillRect(x * size + 1, y * size + size - 4, size - 2, 3);

  // Border
  context.strokeStyle = 'rgba(0,0,0,0.3)';
  context.lineWidth = 0.5;
  context.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
}

function draw() {
  var ox = shakeTimer > 0 ? (Math.random() - 0.5) * shakeIntensity : 0;
  var oy = shakeTimer > 0 ? (Math.random() - 0.5) * shakeIntensity : 0;
  if (shakeTimer > 0) { shakeTimer -= 16; shakeIntensity *= 0.92; }

  ctx2d.save();
  ctx2d.translate(ox, oy);

  // Background
  ctx2d.fillStyle = '#0f1123';
  ctx2d.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx2d.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx2d.lineWidth = 0.5;
  for (var i = 0; i <= COLS; i++) {
    ctx2d.beginPath(); ctx2d.moveTo(i * BLOCK_SIZE, 0); ctx2d.lineTo(i * BLOCK_SIZE, canvas.height); ctx2d.stroke();
  }
  for (var j = 0; j <= ROWS; j++) {
    ctx2d.beginPath(); ctx2d.moveTo(0, j * BLOCK_SIZE); ctx2d.lineTo(canvas.width, j * BLOCK_SIZE); ctx2d.stroke();
  }

  // Border glow
  ctx2d.shadowColor = '#e94560';
  ctx2d.shadowBlur = 10;
  ctx2d.strokeStyle = 'rgba(233,69,96,0.3)';
  ctx2d.lineWidth = 2;
  ctx2d.strokeRect(0, 0, canvas.width, canvas.height);
  ctx2d.shadowBlur = 0;

  // Board
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      if (board[r][c]) {
        drawBlock(ctx2d, c, r, board[r][c], BLOCK_SIZE, false);
      }
    }
  }

  // Ghost piece
  if (currentPiece && !gameOver) {
    var ghost = getGhostPosition();
    var gs = ghost.shape;
    for (var r = 0; r < gs.length; r++) {
      for (var c = 0; c < gs[r].length; c++) {
        if (gs[r][c]) {
          var gy = ghost.y + r;
          var gx = ghost.x + c;
          if (gy >= 0) {
            drawBlock(ctx2d, gx, gy, ghost.color, BLOCK_SIZE, true);
          }
        }
      }
    }

    // Current piece
    var ps = currentPiece.shape;
    for (var r = 0; r < ps.length; r++) {
      for (var c = 0; c < ps[r].length; c++) {
        if (ps[r][c]) {
          var py = currentPiece.y + r;
          var px = currentPiece.x + c;
          if (py >= 0) {
            drawBlock(ctx2d, px, py, currentPiece.color, BLOCK_SIZE, false);
          }
        }
      }
    }
  }

  ctx2d.restore();

  // Draw next piece preview
  drawNextPiece();
}

function drawNextPiece() {
  var w = nextCanvas.width;
  var h = nextCanvas.height;
  nextCtx.fillStyle = 'rgba(15,17,35,0.6)';
  nextCtx.fillRect(0, 0, w, h);

  if (!nextPiece) return;

  var shape = nextPiece.shape;
  var previewSize = 20;
  var pieceW = shape[0].length * previewSize;
  var pieceH = shape.length * previewSize;

  // Count actual filled rows/cols for centering
  var minR = shape.length, maxR = 0, minC = shape[0].length, maxC = 0;
  for (var r = 0; r < shape.length; r++) {
    for (var c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }

  var actualW = (maxC - minC + 1) * previewSize;
  var actualH = (maxR - minR + 1) * previewSize;
  var offsetX = (w - actualW) / 2 - minC * previewSize;
  var offsetY = (h - actualH) / 2 - minR * previewSize;

  nextCtx.save();
  nextCtx.translate(offsetX, offsetY);

  for (var r = 0; r < shape.length; r++) {
    for (var c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        nextCtx.fillStyle = nextPiece.color;
        nextCtx.fillRect(c * previewSize + 1, r * previewSize + 1, previewSize - 2, previewSize - 2);
        nextCtx.fillStyle = 'rgba(255,255,255,0.15)';
        nextCtx.fillRect(c * previewSize + 1, r * previewSize + 1, previewSize - 2, (previewSize - 2) / 3);
        nextCtx.strokeStyle = 'rgba(0,0,0,0.3)';
        nextCtx.lineWidth = 0.5;
        nextCtx.strokeRect(c * previewSize + 1, r * previewSize + 1, previewSize - 2, previewSize - 2);
      }
    }
  }

  nextCtx.restore();
}

// ============ GAME LOOP ============
function gameLoop(timestamp) {
  if (gameOver) {
    draw();
    return;
  }

  if (!paused) {
    if (timestamp - lastDropTime > getDropInterval()) {
      moveDown(false);
      lastDropTime = timestamp;
    }
    draw();
  }

  animationId = requestAnimationFrame(gameLoop);
}

function moveDown(isSoft) {
  if (!currentPiece || gameOver || paused) return;

  var test = { shape: currentPiece.shape, color: currentPiece.color, x: currentPiece.x, y: currentPiece.y + 1, name: currentPiece.name };
  if (isValid(test, board)) {
    currentPiece.y++;
    if (isSoft) score++;
    updateHUD();
  } else {
    lockPiece();
  }
}

function moveLeft() {
  if (!currentPiece || gameOver || paused) return;
  var test = { shape: currentPiece.shape, color: currentPiece.color, x: currentPiece.x - 1, y: currentPiece.y, name: currentPiece.name };
  if (isValid(test, board)) {
    currentPiece.x--;
    AudioEngine.move();
  }
}

function moveRight() {
  if (!currentPiece || gameOver || paused) return;
  var test = { shape: currentPiece.shape, color: currentPiece.color, x: currentPiece.x + 1, y: currentPiece.y, name: currentPiece.name };
  if (isValid(test, board)) {
    currentPiece.x++;
    AudioEngine.move();
  }
}

function rotate() {
  if (!currentPiece || gameOver || paused) return;
  var rotated = rotatePiece(currentPiece);
  var test = { shape: rotated, color: currentPiece.color, x: currentPiece.x, y: currentPiece.y, name: currentPiece.name };

  // Wall kick attempts
  var kicks = [0, -1, 1, -2, 2];
  for (var i = 0; i < kicks.length; i++) {
    var kickTest = { shape: rotated, color: currentPiece.color, x: currentPiece.x + kicks[i], y: currentPiece.y, name: currentPiece.name };
    if (isValid(kickTest, board)) {
      currentPiece.shape = rotated;
      currentPiece.x += kicks[i];
      AudioEngine.rotate();
      return;
    }
  }
}

function hardDrop() {
  if (!currentPiece || gameOver || paused) return;
  var dropped = 0;
  while (isValid({ shape: currentPiece.shape, color: currentPiece.color, x: currentPiece.x, y: currentPiece.y + 1, name: currentPiece.name }, board)) {
    currentPiece.y++;
    dropped++;
  }
  score += dropped * 2;
  updateHUD();
  AudioEngine.drop();
  lockPiece();
}

// ============ START GAME ============
function startGame() {
  menuEl.style.display = 'none';
  deathEl.style.display = 'none';
  pauseEl.style.display = 'none';
  hudEl.style.display = 'flex';
  gameAreaEl.style.display = 'block';

  board = createBoard();
  bag = [];
  score = 0;
  level = 1;
  lines = 0;
  gameOver = false;
  paused = false;
  shakeTimer = 0;
  clearingLines = [];

  nextPiece = createPiece(getNextPieceName());
  currentPiece = createPiece(getNextPieceName());

  updateHUD();
  highVal.textContent = highScore;
  draw();

  // Countdown
  cancelAnimationFrame(animationId);
  var count = 3;
  countdownEl.style.display = 'block';
  countdownEl.textContent = count;
  AudioEngine.countdown();

  countdownInterval = setInterval(function() {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
      AudioEngine.countdown();
    } else {
      countdownEl.textContent = 'GO!';
      AudioEngine.countdownGo();
      setTimeout(function() {
        countdownEl.style.display = 'none';
        lastDropTime = performance.now();
        animationId = requestAnimationFrame(gameLoop);
      }, 300);
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }, 600);
}

// ============ PAUSE ============
function pauseGame() {
  if (gameOver) return;
  paused = true;
  pauseEl.style.display = 'flex';
}

function resumeGame() {
  paused = false;
  pauseEl.style.display = 'none';
  lastDropTime = performance.now();
}

// ============ CONTROLS ============
document.addEventListener('keydown', function(e) {
  var key = e.key.toLowerCase();

  if (key === 'arrowleft' || key === 'a') { moveLeft(); e.preventDefault(); }
  if (key === 'arrowright' || key === 'd') { moveRight(); e.preventDefault(); }
  if (key === 'arrowup' || key === 'w') { rotate(); e.preventDefault(); }
  if (key === 'arrowdown' || key === 's') { moveDown(true); e.preventDefault(); }
  if (key === ' ') { hardDrop(); e.preventDefault(); }
  if (key === 'p') { paused ? resumeGame() : pauseGame(); }
  if (key === 'escape') { if (!gameOver) showMenu(); }
});

// Mobile controls
document.querySelectorAll('.mob-btn').forEach(function(btn) {
  btn.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var action = btn.dataset.action;
    if (action === 'left') moveLeft();
    if (action === 'right') moveRight();
    if (action === 'rotate') rotate();
    if (action === 'down') moveDown(true);
    if (action === 'drop') hardDrop();
    if (action === 'pause') { paused ? resumeGame() : pauseGame(); }
  });
  // Also handle click for non-touch devices
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    var action = btn.dataset.action;
    if (action === 'left') moveLeft();
    if (action === 'right') moveRight();
    if (action === 'rotate') rotate();
    if (action === 'down') moveDown(true);
    if (action === 'drop') hardDrop();
    if (action === 'pause') { paused ? resumeGame() : pauseGame(); }
  });
});

// Initial blank canvas
ctx2d.fillStyle = '#0a0a1a';
ctx2d.fillRect(0, 0, canvas.width, canvas.height);
