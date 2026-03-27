// ============ AUDIO ============
const Audio = (() => {
  let ctx, enabled = true;
  function getCtx() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }
  function play(freq, type, dur, vol = 0.12) {
    if (!enabled) return;
    const c = getCtx(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.start(); o.stop(c.currentTime + dur);
  }
  return {
    set enabled(v) { enabled = v; },
    get enabled() { return enabled; },
    placeX() { play(500, 'sine', 0.1); setTimeout(() => play(700, 'sine', 0.08), 40); },
    placeO() { play(400, 'sine', 0.12); setTimeout(() => play(350, 'sine', 0.1), 50); },
    win() { [0,80,160,240].forEach((d,i) => setTimeout(() => play(500 + i*100, 'sine', 0.15, 0.1), d)); },
    draw() { play(300, 'triangle', 0.3, 0.08); },
    click() { play(600, 'sine', 0.05, 0.06); },
  };
})();

// ============ PARTICLES ============
const pCanvas = document.getElementById('particleCanvas');
const pCtx = pCanvas.getContext('2d');
let particles = [];
let animFrame;

function resizeParticleCanvas() {
  pCanvas.width = window.innerWidth;
  pCanvas.height = window.innerHeight;
}
resizeParticleCanvas();
window.addEventListener('resize', resizeParticleCanvas);

function spawnParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const speed = 2 + Math.random() * 3;
    particles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 1, decay: 0.015 + Math.random() * 0.015,
      size: 3 + Math.random() * 4, color
    });
  }
  if (!animFrame) animateParticles();
}

function animateParticles() {
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.97; p.vy *= 0.97;
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    pCtx.globalAlpha = p.life;
    pCtx.fillStyle = p.color;
    pCtx.beginPath();
    pCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    pCtx.fill();
  }
  pCtx.globalAlpha = 1;
  if (particles.length > 0) {
    animFrame = requestAnimationFrame(animateParticles);
  } else {
    animFrame = null;
  }
}

// ============ STATE ============
let board = Array(9).fill(null);
let currentPlayer = 'X';
let gameActive = false;
let mode = 'ai';
let difficulty = 'normal';
let scores = { X: 0, O: 0, draw: 0 };
const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

// ============ UI REFS ============
const menuEl = document.getElementById('menu');
const hudEl = document.getElementById('hud');
const gameAreaEl = document.getElementById('gameArea');
const boardEl = document.getElementById('board');
const turnEl = document.getElementById('turnIndicator');
const resultEl = document.getElementById('resultOverlay');
const resultTitle = document.getElementById('resultTitle');
const resultSub = document.getElementById('resultSub');
const diffSection = document.getElementById('difficultySection');

// ============ MENU LOGIC ============
document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.mode-btn[data-mode].active').classList.remove('active');
    btn.classList.add('active');
    mode = btn.dataset.mode;
    diffSection.style.display = mode === 'ai' ? 'block' : 'none';
  });
});

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.diff-btn.active').classList.remove('active');
    btn.classList.add('active');
    difficulty = btn.dataset.diff;
  });
});

document.getElementById('soundToggle').addEventListener('click', function() {
  this.classList.toggle('on');
  Audio.enabled = this.classList.contains('on');
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('playAgainBtn').addEventListener('click', startGame);
document.getElementById('backMenuBtn').addEventListener('click', showMenu);
document.getElementById('infoBtn').addEventListener('click', () => {
  menuEl.style.display = 'none';
  document.getElementById('infoOverlay').style.display = 'flex';
});
document.getElementById('infoCloseBtn').addEventListener('click', () => {
  document.getElementById('infoOverlay').style.display = 'none';
  menuEl.style.display = 'flex';
});

// "Back to Game Hubs" button listener
document.getElementById('backToHubsBtn').addEventListener('click', function() {
  if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
    window.location.href = chrome.runtime.getURL('index.html');
  } else {
    window.location.href = '../index.html';
  }
});

function updateScoreDisplay() {
  document.getElementById('xScore').textContent = scores.X;
  document.getElementById('oScore').textContent = scores.O;
  document.getElementById('drawScore').textContent = scores.draw;
  document.getElementById('menuXWins').textContent = scores.X;
  document.getElementById('menuOWins').textContent = scores.O;
  document.getElementById('menuDraws').textContent = scores.draw;
}

function showMenu() {
  menuEl.style.display = 'flex';
  hudEl.style.display = 'none';
  gameAreaEl.style.display = 'none';
  resultEl.style.display = 'none';
  updateScoreDisplay();
}

// ============ GAME ============
function startGame() {
  menuEl.style.display = 'none';
  resultEl.style.display = 'none';
  hudEl.style.display = 'flex';
  gameAreaEl.style.display = 'flex';
  updateScoreDisplay();

  board = Array(9).fill(null);
  currentPlayer = 'X';
  gameActive = true;

  buildBoard();
  updateTurn();
}

function buildBoard() {
  boardEl.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    cell.addEventListener('click', () => handleCellClick(i));
    boardEl.appendChild(cell);
  }
}

function updateTurn() {
  if (!gameActive) { turnEl.textContent = ''; return; }
  const cls = currentPlayer === 'X' ? 'x-color' : 'o-color';
  const label = mode === 'ai' && currentPlayer === 'O' ? 'AI thinking...' : `${currentPlayer}'s turn`;
  turnEl.innerHTML = `<span class="${cls}">${label}</span>`;
}

function handleCellClick(i) {
  if (!gameActive || board[i]) return;
  if (mode === 'ai' && currentPlayer === 'O') return;

  makeMove(i);

  if (gameActive && mode === 'ai' && currentPlayer === 'O') {
    setTimeout(aiMove, 400);
  }
}

function makeMove(i) {
  board[i] = currentPlayer;
  const cell = boardEl.children[i];
  cell.classList.add('disabled');

  // Draw the mark with canvas animation
  drawMark(cell, currentPlayer);

  if (currentPlayer === 'X') Audio.placeX(); else Audio.placeO();

  const winLine = checkWin();
  if (winLine) {
    gameActive = false;
    scores[currentPlayer]++;
    updateScoreDisplay();
    highlightWin(winLine);
    Audio.win();

    // Particles on winning cells
    winLine.forEach(idx => {
      const rect = boardEl.children[idx].getBoundingClientRect();
      spawnParticles(rect.left + rect.width/2, rect.top + rect.height/2, currentPlayer === 'X' ? '#e94560' : '#4a90d9', 15);
    });

    setTimeout(() => showResult(currentPlayer), 800);
    return;
  }

  if (board.every(c => c !== null)) {
    gameActive = false;
    scores.draw++;
    updateScoreDisplay();
    Audio.draw();
    setTimeout(() => showResult(null), 500);
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateTurn();
}

function drawMark(cell, player) {
  const size = cell.offsetWidth;
  const cvs = document.createElement('canvas');
  cvs.width = size; cvs.height = size;
  cell.appendChild(cvs);
  const c = cvs.getContext('2d');
  const pad = size * 0.22;

  if (player === 'X') {
    animateX(c, size, pad);
  } else {
    animateO(c, size, pad);
  }
}

function animateX(c, size, pad) {
  let progress = 0;
  const step = 0.06;
  function frame() {
    progress = Math.min(progress + step, 1);
    c.clearRect(0, 0, size, size);
    c.strokeStyle = '#e94560';
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.shadowColor = '#e94560';
    c.shadowBlur = 10;

    if (progress <= 0.5) {
      const t = progress / 0.5;
      c.beginPath();
      c.moveTo(pad, pad);
      c.lineTo(pad + (size - 2*pad) * t, pad + (size - 2*pad) * t);
      c.stroke();
    } else {
      const t = (progress - 0.5) / 0.5;
      c.beginPath();
      c.moveTo(pad, pad);
      c.lineTo(size - pad, size - pad);
      c.stroke();
      c.beginPath();
      c.moveTo(size - pad, pad);
      c.lineTo(size - pad - (size - 2*pad) * t, pad + (size - 2*pad) * t);
      c.stroke();
    }
    c.shadowBlur = 0;
    if (progress < 1) requestAnimationFrame(frame);
  }
  frame();
}

function animateO(c, size, pad) {
  let progress = 0;
  const step = 0.05;
  const cx = size/2, cy = size/2, r = size/2 - pad;
  function frame() {
    progress = Math.min(progress + step, 1);
    c.clearRect(0, 0, size, size);
    c.strokeStyle = '#4a90d9';
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.shadowColor = '#4a90d9';
    c.shadowBlur = 10;
    c.beginPath();
    c.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * progress);
    c.stroke();
    c.shadowBlur = 0;
    if (progress < 1) requestAnimationFrame(frame);
  }
  frame();
}

function checkWin() {
  for (const line of WINS) {
    const [a,b,c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}

function highlightWin(line) {
  line.forEach(i => boardEl.children[i].classList.add('win-cell'));
}

function showResult(winner) {
  resultEl.style.display = 'flex';
  if (winner) {
    resultTitle.textContent = `${winner} WINS!`;
    resultTitle.className = winner === 'X' ? 'x-win' : 'o-win';
    if (mode === 'ai') {
      resultSub.textContent = winner === 'X' ? 'You beat the AI!' : 'AI wins this round.';
    } else {
      resultSub.textContent = `Player ${winner} takes the round!`;
    }
  } else {
    resultTitle.textContent = "DRAW!";
    resultTitle.className = 'draw';
    resultSub.textContent = "It's a tie — well played!";
  }
}

// ============ AI ============
function aiMove() {
  if (!gameActive) return;
  let move;
  if (difficulty === 'easy') {
    move = aiEasy();
  } else if (difficulty === 'normal') {
    move = Math.random() < 0.7 ? aiBest() : aiEasy();
  } else {
    move = aiBest();
  }
  if (move !== undefined) makeMove(move);
}

function aiEasy() {
  const empty = board.map((v,i) => v === null ? i : -1).filter(i => i >= 0);
  return empty[Math.floor(Math.random() * empty.length)];
}

function aiBest() {
  let bestScore = -Infinity, bestMove;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = 'O';
    const s = minimax(board, 0, false, -Infinity, Infinity);
    board[i] = null;
    if (s > bestScore) { bestScore = s; bestMove = i; }
  }
  return bestMove;
}

function minimax(b, depth, isMax, alpha, beta) {
  const w = checkWinFor(b);
  if (w === 'O') return 10 - depth;
  if (w === 'X') return depth - 10;
  if (b.every(c => c !== null)) return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = 'O';
      best = Math.max(best, minimax(b, depth+1, false, alpha, beta));
      b[i] = null;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = 'X';
      best = Math.min(best, minimax(b, depth+1, true, alpha, beta));
      b[i] = null;
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function checkWinFor(b) {
  for (const [a,x,c] of WINS) {
    if (b[a] && b[a] === b[x] && b[a] === b[c]) return b[a];
  }
  return null;
}

// ============ KEYBOARD ============
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') showMenu();
});
