// ============ AUDIO ============
const SFX = (() => {
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
    hit() { play(500, 'square', 0.06, 0.1); },
    wall() { play(350, 'sine', 0.05, 0.08); },
    score() { play(250, 'sawtooth', 0.2, 0.1); },
    win() { [0,80,160,240].forEach((d,i) => setTimeout(() => play(500 + i*100, 'sine', 0.15, 0.1), d)); },
    countdown() { play(440, 'sine', 0.15, 0.1); },
    countdownGo() { play(880, 'sine', 0.25, 0.15); },
  };
})();

// ============ CANVAS ============
const canvas = document.getElementById('gameCanvas');
const c = canvas.getContext('2d');
let W, H;

function resize() {
  const maxW = Math.min(window.innerWidth - 20, 700);
  const maxH = Math.min(window.innerHeight - 40, 500);
  const ratio = 7 / 5;
  if (maxW / maxH > ratio) {
    H = maxH; W = Math.floor(H * ratio);
  } else {
    W = maxW; H = Math.floor(W / ratio);
  }
  canvas.width = W; canvas.height = H;
}
resize();
window.addEventListener('resize', resize);

// ============ STATE ============
let mode = 'ai', difficulty = 'normal', winScore = 7;
let paused = false, gameActive = false;
let scores = { p1: 0, p2: 0 };
let ball, p1, p2, particles = [];
let keys = {};
let animId;

const PADDLE_W_RATIO = 0.018;
const PADDLE_H_RATIO = 0.18;
const BALL_R_RATIO = 0.012;
const PADDLE_SPEED_RATIO = 0.008;
const BALL_SPEED_RATIO = 0.006;

const AI_SPEED = { easy: 0.004, normal: 0.006, hard: 0.0085 };
const AI_ERROR = { easy: 60, normal: 25, hard: 5 };

// ============ UI REFS ============
const menuEl = document.getElementById('menu');
const pauseEl = document.getElementById('pauseOverlay');
const resultEl = document.getElementById('resultOverlay');
const resultTitle = document.getElementById('resultTitle');
const resultSub = document.getElementById('resultSub');
const countdownEl = document.getElementById('countdown');
const diffSection = document.getElementById('difficultySection');

// ============ MENU ============
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

document.querySelectorAll('.score-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.score-btn.active').classList.remove('active');
    btn.classList.add('active');
    winScore = parseInt(btn.dataset.score);
  });
});

document.getElementById('soundToggle').addEventListener('click', function() {
  this.classList.toggle('on');
  SFX.enabled = this.classList.contains('on');
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('playAgainBtn').addEventListener('click', startGame);
document.getElementById('backMenuBtn').addEventListener('click', showMenu);
document.getElementById('resumeBtn').addEventListener('click', resumeGame);
document.getElementById('quitBtn').addEventListener('click', showMenu);
document.getElementById('infoBtn').addEventListener('click', () => {
  menuEl.style.display = 'none';
  document.getElementById('infoOverlay').style.display = 'flex';
});
document.getElementById('infoCloseBtn').addEventListener('click', () => {
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
  cancelAnimationFrame(animId);
  gameActive = false;
  menuEl.style.display = 'flex';
  pauseEl.style.display = 'none';
  resultEl.style.display = 'none';
  c.fillStyle = '#0a0a1a';
  c.fillRect(0, 0, W, H);
}

// ============ GAME INIT ============
function startGame() {
  resize();
  menuEl.style.display = 'none';
  resultEl.style.display = 'none';
  pauseEl.style.display = 'none';
  paused = false;
  gameActive = true;
  scores = { p1: 0, p2: 0 };
  particles = [];

  initPaddles();
  resetBall(1);

  // Countdown
  cancelAnimationFrame(animId);
  let count = 3;
  countdownEl.style.display = 'block';
  countdownEl.textContent = count;
  drawFrame();
  SFX.countdown();

  const cdInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
      SFX.countdown();
    } else {
      countdownEl.textContent = 'GO!';
      SFX.countdownGo();
      setTimeout(() => {
        countdownEl.style.display = 'none';
        lastTime = performance.now();
        animId = requestAnimationFrame(gameLoop);
      }, 300);
      clearInterval(cdInterval);
    }
  }, 600);
}

function initPaddles() {
  const pw = W * PADDLE_W_RATIO;
  const ph = H * PADDLE_H_RATIO;
  p1 = { x: 20, y: H/2 - ph/2, w: pw, h: ph, speed: H * PADDLE_SPEED_RATIO, score: 0 };
  p2 = { x: W - 20 - pw, y: H/2 - ph/2, w: pw, h: ph, speed: H * PADDLE_SPEED_RATIO, score: 0 };
}

function resetBall(dir) {
  const speed = W * BALL_SPEED_RATIO;
  const angle = (Math.random() * 0.8 - 0.4);
  ball = {
    x: W/2, y: H/2,
    r: Math.max(W * BALL_R_RATIO, 4),
    vx: speed * dir * Math.cos(angle),
    vy: speed * Math.sin(angle),
    baseSpeed: speed,
    speed: speed,
    trail: []
  };
}

// ============ GAME LOOP ============
let lastTime = 0;

function gameLoop(time) {
  if (!gameActive) return;
  const dt = Math.min((time - lastTime) / 16.667, 3); // normalize to ~60fps
  lastTime = time;

  if (!paused) {
    update(dt);
    updateParticles(dt);
  }
  drawFrame();
  animId = requestAnimationFrame(gameLoop);
}

function update(dt) {
  // Player 1 input
  if (keys['w'] || keys['W']) p1.y -= p1.speed * dt;
  if (keys['s'] || keys['S']) p1.y += p1.speed * dt;
  p1.y = Math.max(0, Math.min(H - p1.h, p1.y));

  // Player 2 / AI
  if (mode === 'local') {
    if (keys['ArrowUp']) p2.y -= p2.speed * dt;
    if (keys['ArrowDown']) p2.y += p2.speed * dt;
  } else {
    aiUpdate(dt);
  }
  p2.y = Math.max(0, Math.min(H - p2.h, p2.y));

  // Ball trail
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 12) ball.trail.shift();

  // Ball movement
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Top/bottom walls
  if (ball.y - ball.r <= 0) {
    ball.y = ball.r;
    ball.vy = Math.abs(ball.vy);
    SFX.wall();
    spawnParticles(ball.x, ball.y, 'rgba(255,255,255,0.5)', 4);
  }
  if (ball.y + ball.r >= H) {
    ball.y = H - ball.r;
    ball.vy = -Math.abs(ball.vy);
    SFX.wall();
    spawnParticles(ball.x, ball.y, 'rgba(255,255,255,0.5)', 4);
  }

  // Paddle collisions
  if (ballHitsPaddle(p1)) {
    ball.x = p1.x + p1.w + ball.r;
    deflect(p1, 1);
    SFX.hit();
    spawnParticles(ball.x, ball.y, '#e94560', 8);
  }
  if (ballHitsPaddle(p2)) {
    ball.x = p2.x - ball.r;
    deflect(p2, -1);
    SFX.hit();
    spawnParticles(ball.x, ball.y, '#4a90d9', 8);
  }

  // Scoring
  if (ball.x + ball.r < 0) {
    scores.p2++;
    SFX.score();
    spawnParticles(0, ball.y, '#4a90d9', 15);
    if (scores.p2 >= winScore) return endGame('p2');
    resetBall(-1);
  }
  if (ball.x - ball.r > W) {
    scores.p1++;
    SFX.score();
    spawnParticles(W, ball.y, '#e94560', 15);
    if (scores.p1 >= winScore) return endGame('p1');
    resetBall(1);
  }
}

function ballHitsPaddle(p) {
  return ball.x - ball.r < p.x + p.w &&
         ball.x + ball.r > p.x &&
         ball.y + ball.r > p.y &&
         ball.y - ball.r < p.y + p.h;
}

function deflect(paddle, dir) {
  const hitPos = (ball.y - (paddle.y + paddle.h/2)) / (paddle.h/2);
  const maxAngle = Math.PI / 3.5;
  const angle = hitPos * maxAngle;
  ball.speed = Math.min(ball.speed * 1.05, ball.baseSpeed * 2.2);
  ball.vx = ball.speed * dir * Math.cos(angle);
  ball.vy = ball.speed * Math.sin(angle);
}

function aiUpdate(dt) {
  const aiSpeed = H * AI_SPEED[difficulty];
  const error = AI_ERROR[difficulty] * (Math.sin(performance.now() * 0.001) * 0.5 + 0.5);
  const target = ball.y + error * Math.sin(performance.now() * 0.003) - p2.h/2;
  const center = p2.y + p2.h/2;
  const diff = (target + p2.h/2) - center;

  if (Math.abs(diff) > 4) {
    p2.y += Math.sign(diff) * Math.min(Math.abs(diff), aiSpeed * dt);
  }
}

function endGame(winner) {
  gameActive = false;
  cancelAnimationFrame(animId);
  SFX.win();

  setTimeout(() => {
    resultEl.style.display = 'flex';
    if (winner === 'p1') {
      resultTitle.textContent = mode === 'ai' ? 'YOU WIN!' : 'PLAYER 1 WINS!';
      resultTitle.style.color = '#e94560';
      resultSub.textContent = `${scores.p1} - ${scores.p2}`;
    } else {
      resultTitle.textContent = mode === 'ai' ? 'AI WINS!' : 'PLAYER 2 WINS!';
      resultTitle.style.color = '#4a90d9';
      resultSub.textContent = `${scores.p1} - ${scores.p2}`;
    }
  }, 400);
}

// ============ PARTICLES ============
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const spd = 1.5 + Math.random() * 2.5;
    particles.push({
      x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
      life: 1, decay: 0.02 + Math.random() * 0.02,
      size: 2 + Math.random() * 3, color
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.97; p.vy *= 0.97;
    p.life -= p.decay * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ============ DRAWING ============
function drawFrame() {
  // Background
  c.fillStyle = '#0f1123';
  c.fillRect(0, 0, W, H);

  // Center line
  c.setLineDash([8, 8]);
  c.strokeStyle = 'rgba(255,255,255,0.06)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(W/2, 0);
  c.lineTo(W/2, H);
  c.stroke();
  c.setLineDash([]);

  // Center circle
  c.strokeStyle = 'rgba(255,255,255,0.04)';
  c.lineWidth = 1;
  c.beginPath();
  c.arc(W/2, H/2, 50, 0, Math.PI * 2);
  c.stroke();

  // Border
  c.strokeStyle = 'rgba(233,69,96,0.2)';
  c.lineWidth = 2;
  c.strokeRect(0, 0, W, H);

  // Scores
  c.font = `bold ${Math.floor(H * 0.12)}px Segoe UI`;
  c.textAlign = 'center';
  c.fillStyle = 'rgba(233,69,96,0.15)';
  c.fillText(scores.p1, W * 0.25, H * 0.16);
  c.fillStyle = 'rgba(74,144,217,0.15)';
  c.fillText(scores.p2, W * 0.75, H * 0.16);

  // Ball trail
  if (ball) {
    ball.trail.forEach((t, i) => {
      const alpha = (i / ball.trail.length) * 0.2;
      c.fillStyle = `rgba(255,255,255,${alpha})`;
      c.beginPath();
      c.arc(t.x, t.y, ball.r * (i / ball.trail.length) * 0.7, 0, Math.PI * 2);
      c.fill();
    });

    // Ball
    c.shadowColor = '#fff';
    c.shadowBlur = 15;
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
  }

  // Paddles
  if (p1) {
    // P1 - red
    c.shadowColor = '#e94560';
    c.shadowBlur = 12;
    c.fillStyle = '#e94560';
    roundRect(c, p1.x, p1.y, p1.w, p1.h, 4);
    c.shadowBlur = 0;
    // Shine
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.fillRect(p1.x + 1, p1.y + 2, p1.w - 2, p1.h * 0.3);
  }
  if (p2) {
    // P2 - blue
    c.shadowColor = '#4a90d9';
    c.shadowBlur = 12;
    c.fillStyle = '#4a90d9';
    roundRect(c, p2.x, p2.y, p2.w, p2.h, 4);
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.fillRect(p2.x + 1, p2.y + 2, p2.w - 2, p2.h * 0.3);
  }

  // Particles
  particles.forEach(p => {
    c.globalAlpha = p.life;
    c.fillStyle = p.color;
    c.beginPath();
    c.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    c.fill();
  });
  c.globalAlpha = 1;

  // Score indicators at top
  if (gameActive || resultEl.style.display === 'flex') {
    const dotR = 4;
    const gap = 14;
    const startX1 = W * 0.25 - (winScore * gap) / 2;
    const startX2 = W * 0.75 - (winScore * gap) / 2;
    const dotY = H * 0.2 + 8;
    for (let i = 0; i < winScore; i++) {
      c.fillStyle = i < scores.p1 ? '#e94560' : 'rgba(233,69,96,0.15)';
      c.beginPath(); c.arc(startX1 + i * gap + gap/2, dotY, dotR, 0, Math.PI * 2); c.fill();

      c.fillStyle = i < scores.p2 ? '#4a90d9' : 'rgba(74,144,217,0.15)';
      c.beginPath(); c.arc(startX2 + i * gap + gap/2, dotY, dotR, 0, Math.PI * 2); c.fill();
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

// ============ CONTROLS ============
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === 'p' || e.key === 'P') {
    if (gameActive) paused ? resumeGame() : pauseGame();
  }
  if (e.key === 'Escape') showMenu();
  if (['ArrowUp','ArrowDown','w','W','s','S'].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

function pauseGame() {
  paused = true;
  pauseEl.style.display = 'flex';
}

function resumeGame() {
  paused = false;
  pauseEl.style.display = 'none';
}

// Mobile touch
let touches = {};
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    touches[t.identifier] = { x: t.clientX, y: t.clientY };
  }
});
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) {
    const prev = touches[t.identifier];
    if (!prev) continue;
    const dy = t.clientY - prev.y;
    const side = t.clientX < rect.left + rect.width/2 ? 'left' : 'right';
    if (side === 'left') p1.y += dy;
    else if (mode === 'local') p2.y += dy;
    p1.y = Math.max(0, Math.min(H - p1.h, p1.y));
    p2.y = Math.max(0, Math.min(H - p2.h, p2.y));
    touches[t.identifier] = { x: t.clientX, y: t.clientY };
  }
});
canvas.addEventListener('touchend', e => {
  for (const t of e.changedTouches) delete touches[t.identifier];
});

// Initial draw
c.fillStyle = '#0a0a1a';
c.fillRect(0, 0, W, H);
