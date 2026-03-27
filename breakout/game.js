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
    paddleHit() { play(440, 'sine', 0.08); setTimeout(() => play(660, 'sine', 0.06), 30); },
    brickHit() { play(600, 'square', 0.06, 0.1); setTimeout(() => play(800, 'square', 0.06, 0.1), 30); },
    wallHit() { play(300, 'sine', 0.05, 0.08); },
    die() { play(200, 'sawtooth', 0.3, 0.12); setTimeout(() => play(100, 'sawtooth', 0.4, 0.1), 100); },
    powerup() { play(400, 'square', 0.08, 0.1); setTimeout(() => play(600, 'square', 0.08, 0.1), 60); setTimeout(() => play(900, 'square', 0.15, 0.1), 120); },
    levelUp() { play(523, 'sine', 0.12, 0.12); setTimeout(() => play(659, 'sine', 0.12, 0.12), 100); setTimeout(() => play(784, 'sine', 0.12, 0.12), 200); setTimeout(() => play(1047, 'sine', 0.2, 0.15), 300); },
    countdown() { play(440, 'sine', 0.15, 0.1); },
    countdownGo() { play(880, 'sine', 0.25, 0.15); },
    launch() { play(500, 'sine', 0.1, 0.1); },
  };
})();

// ============ CANVAS SETUP ============
const canvas = document.getElementById('gameCanvas');
const ctx2d = canvas.getContext('2d');
let CW, CH;

function resizeCanvas() {
  const maxW = Math.min(window.innerWidth - 20, 600);
  const maxH = Math.min(window.innerHeight - 100, 700);
  CW = Math.floor(maxW);
  CH = Math.floor(maxH);
  canvas.width = CW;
  canvas.height = CH;
}
resizeCanvas();
window.addEventListener('resize', () => {
  resizeCanvas();
  if (state === 'playing' || state === 'waiting') {
    paddle.y = CH - 40;
  }
});

// ============ GAME STATE ============
let state = 'menu'; // menu, waiting, playing, paused, dead, levelComplete
let score = 0, lives = 3, level = 1;
let highScore = parseInt(localStorage.getItem('breakoutHighScore') || '0');
let difficulty = 'normal';
let particles = [];
let powerups = [];
let shakeTimer = 0, shakeIntensity = 0;
let balls = [];
let bricks = [];
let fallingPowerups = [];
let activePowerTimers = {};
let animFrameId = null;

const DIFF_SETTINGS = {
  easy:   { ballSpeed: 3.5, paddleW: 100, lives: 5, speedInc: 0.3 },
  normal: { ballSpeed: 5,   paddleW: 80,  lives: 3, speedInc: 0.5 },
  hard:   { ballSpeed: 6.5, paddleW: 60,  lives: 2, speedInc: 0.7 },
};

// Brick types: color, hits, points
const BRICK_TYPES = {
  r: { color: '#e94560', hits: 1, points: 10 },
  o: { color: '#f5a623', hits: 1, points: 20 },
  y: { color: '#ffd700', hits: 1, points: 30 },
  g: { color: '#00ff88', hits: 1, points: 40 },
  b: { color: '#4a90d9', hits: 2, points: 50 },
  p: { color: '#9b59b6', hits: 3, points: 80 },
  s: { color: '#c0c0c0', hits: 4, points: 100 },
  x: { color: '#ffd700', hits: -1, points: 0 }, // indestructible (gold)
};

// Level layouts (rows of brick type chars, '.' = empty)
const LEVELS = [
  // Level 1 - Simple
  [
    'rrrrrrrrrr',
    'oooooooooo',
    'yyyyyyyyyy',
    'gggggggggg',
  ],
  // Level 2 - With blues
  [
    '..bbbbbb..',
    'rrrrrrrrrr',
    'oooooooooo',
    'yyyyyyyyyy',
    'gggggggggg',
  ],
  // Level 3 - Mixed with purples
  [
    '.pp....pp.',
    'bbbbbbbbbb',
    'rrrrrrrrrr',
    'oooooooooo',
    'yyyyyyyyyy',
  ],
  // Level 4 - Silver fortress
  [
    'ssssssssss',
    'p.bb..bb.p',
    'r.rr..rr.r',
    'o.oo..oo.o',
    'yyyyyyyyyy',
    'gggggggggg',
  ],
  // Level 5 - Gold barriers
  [
    'x..rrrr..x',
    '.bbbbbbbb.',
    'pppppppppp',
    '.rrrrrrrr.',
    'x..gggg..x',
    'oooooooooo',
  ],
  // Level 6 - Checkerboard
  [
    'r.o.y.g.b.',
    '.r.o.y.g.b',
    'b.r.o.y.g.',
    '.b.r.o.y.g',
    'p.b.r.o.y.',
    '.p.b.r.o.y',
  ],
  // Level 7 - Diamond
  [
    '....pp....',
    '...bbbb...',
    '..rrrrrr..',
    '.oooooooo.',
    '..rrrrrr..',
    '...bbbb...',
    '....pp....',
  ],
  // Level 8 - Hard
  [
    'ssssssssss',
    'x.pppppp.x',
    'bbbbbbbbbb',
    'x.rrrrrr.x',
    'oooooooooo',
    'yyyyyyyyyy',
    'gggggggggg',
  ],
];

// Paddle
const paddle = { x: 0, y: 0, w: 80, h: 12 };

// ============ UI REFERENCES ============
const menuEl = document.getElementById('menu');
const hudEl = document.getElementById('hud');
const pauseEl = document.getElementById('pauseOverlay');
const deathEl = document.getElementById('deathOverlay');
const countdownEl = document.getElementById('countdown');
const powerupIndEl = document.getElementById('powerupIndicator');
const levelCompleteEl = document.getElementById('levelComplete');
const scoreVal = document.getElementById('scoreVal');
const livesVal = document.getElementById('livesVal');
const levelVal = document.getElementById('levelVal');
const highVal = document.getElementById('highVal');
const finalScoreEl = document.getElementById('finalScore');
const newHighLabel = document.getElementById('newHighLabel');
const menuHighScore = document.getElementById('menuHighScore');
const nextLevelVal = document.getElementById('nextLevelVal');

menuHighScore.textContent = highScore;
highVal.textContent = highScore;

// ============ MENU LOGIC ============
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.diff-btn.active').classList.remove('active');
    btn.classList.add('active');
    difficulty = btn.dataset.diff;
  });
});

document.getElementById('soundToggle').addEventListener('click', function() {
  this.classList.toggle('on');
  AudioEngine.enabled = this.classList.contains('on');
});

document.getElementById('startBtn').addEventListener('click', () => startGame());
document.getElementById('retryBtn').addEventListener('click', () => startGame());
document.getElementById('menuBtn').addEventListener('click', showMenu);
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
  state = 'menu';
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = null;
  menuEl.style.display = 'flex';
  hudEl.style.display = 'none';
  pauseEl.style.display = 'none';
  deathEl.style.display = 'none';
  levelCompleteEl.style.display = 'none';
  powerupIndEl.style.display = 'none';
  menuHighScore.textContent = highScore;
  ctx2d.fillStyle = '#0a0a1a';
  ctx2d.fillRect(0, 0, canvas.width, canvas.height);
}

// ============ BRICK INIT ============
function initBricks() {
  bricks = [];
  const layoutIndex = (level - 1) % LEVELS.length;
  const layout = LEVELS[layoutIndex];
  const cols = layout[0].length;
  const rows = layout.length;
  const brickW = (CW - 20) / cols;
  const brickH = 20;
  const offsetX = 10;
  const offsetY = 60;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ch = layout[row][col];
      if (ch === '.') continue;
      const type = BRICK_TYPES[ch];
      if (!type) continue;
      // Extra hits in higher cycles through levels
      const cycle = Math.floor((level - 1) / LEVELS.length);
      const extraHits = type.hits > 0 ? cycle : 0;
      bricks.push({
        x: offsetX + col * brickW,
        y: offsetY + row * (brickH + 3),
        w: brickW - 2,
        h: brickH,
        color: type.color,
        hits: type.hits > 0 ? type.hits + extraHits : type.hits,
        maxHits: type.hits > 0 ? type.hits + extraHits : type.hits,
        points: type.points + cycle * 10,
        type: ch,
      });
    }
  }
}

// ============ BALL CREATION ============
function createBall(x, y, dx, dy) {
  const settings = DIFF_SETTINGS[difficulty];
  const speed = settings.ballSpeed + (level - 1) * settings.speedInc;
  return { x, y, dx: dx * speed, dy: dy * speed, radius: 6, speed };
}

function resetBall() {
  balls = [];
  const settings = DIFF_SETTINGS[difficulty];
  const speed = settings.ballSpeed + (level - 1) * settings.speedInc;
  balls.push({
    x: paddle.x + paddle.w / 2,
    y: paddle.y - 8,
    dx: 0,
    dy: 0,
    radius: 6,
    speed,
    attached: true,
  });
}

// ============ GAME INIT ============
function startGame() {
  resizeCanvas();
  menuEl.style.display = 'none';
  deathEl.style.display = 'none';
  pauseEl.style.display = 'none';
  levelCompleteEl.style.display = 'none';
  hudEl.style.display = 'flex';
  powerupIndEl.style.display = 'none';

  const settings = DIFF_SETTINGS[difficulty];
  score = 0;
  lives = settings.lives;
  level = 1;
  particles = [];
  fallingPowerups = [];
  activePowerTimers = {};
  shakeTimer = 0;

  paddle.w = settings.paddleW;
  paddle.h = 12;
  paddle.x = CW / 2 - paddle.w / 2;
  paddle.y = CH - 40;

  updateHUD();
  initBricks();
  resetBall();
  state = 'waiting';

  if (animFrameId) cancelAnimationFrame(animFrameId);
  lastTime = performance.now();
  animFrameId = requestAnimationFrame(gameLoop);
}

function startLevel() {
  levelCompleteEl.style.display = 'none';
  fallingPowerups = [];
  activePowerTimers = {};
  powerupIndEl.style.display = 'none';
  paddle.w = DIFF_SETTINGS[difficulty].paddleW;
  initBricks();
  resetBall();
  state = 'waiting';
}

// ============ HUD ============
function updateHUD() {
  scoreVal.textContent = score;
  livesVal.textContent = lives;
  levelVal.textContent = level;
  highVal.textContent = Math.max(score, highScore);
}

// ============ PARTICLES ============
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const speed = 1.5 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
      size: 2 + Math.random() * 3,
      color,
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= p.decay * dt * 60;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ============ POWERUP DROPS ============
function tryDropPowerup(x, y) {
  if (Math.random() > 0.15) return; // 15% chance
  const types = [
    { name: 'WIDE', color: '#00bfff', effect: 'wide' },
    { name: 'MULTI', color: '#ff69b4', effect: 'multi' },
    { name: 'LIFE', color: '#00ff88', effect: 'life' },
  ];
  const type = types[Math.floor(Math.random() * types.length)];
  fallingPowerups.push({
    x: x,
    y: y,
    w: 30,
    h: 14,
    vy: 2,
    ...type,
  });
}

function applyPowerup(pu) {
  AudioEngine.powerup();
  if (pu.effect === 'wide') {
    paddle.w = DIFF_SETTINGS[difficulty].paddleW * 1.5;
    activePowerTimers.wide = 10;
    powerupIndEl.style.display = 'block';
    powerupIndEl.textContent = 'WIDE PADDLE';
    powerupIndEl.style.background = '#00bfff';
    powerupIndEl.style.color = '#000';
  } else if (pu.effect === 'multi') {
    const newBalls = [];
    const existing = balls.filter(b => !b.attached);
    if (existing.length > 0) {
      const src = existing[0];
      for (let a = -1; a <= 1; a += 2) {
        const angle = Math.atan2(src.dy, src.dx) + a * 0.4;
        newBalls.push({
          x: src.x,
          y: src.y,
          dx: Math.cos(angle) * src.speed,
          dy: Math.sin(angle) * src.speed,
          radius: 6,
          speed: src.speed,
          attached: false,
        });
      }
    }
    balls = balls.concat(newBalls);
  } else if (pu.effect === 'life') {
    lives++;
    updateHUD();
  }
}

// ============ COLLISION ============
function ballPaddleCollision(ball) {
  if (ball.dy < 0) return false;
  if (ball.y + ball.radius >= paddle.y &&
      ball.y + ball.radius <= paddle.y + paddle.h + 4 &&
      ball.x >= paddle.x - ball.radius &&
      ball.x <= paddle.x + paddle.w + ball.radius) {
    // Calculate hit position (-1 to 1)
    const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    const angle = hitPos * (Math.PI / 3); // max 60 deg
    const speed = ball.speed;
    ball.dx = Math.sin(angle) * speed;
    ball.dy = -Math.cos(angle) * speed;
    ball.y = paddle.y - ball.radius;
    return true;
  }
  return false;
}

function ballBrickCollision(ball) {
  for (let i = bricks.length - 1; i >= 0; i--) {
    const b = bricks[i];
    // AABB vs circle
    const closestX = Math.max(b.x, Math.min(ball.x, b.x + b.w));
    const closestY = Math.max(b.y, Math.min(ball.y, b.y + b.h));
    const distX = ball.x - closestX;
    const distY = ball.y - closestY;
    if (distX * distX + distY * distY < ball.radius * ball.radius) {
      // Determine collision side
      const overlapLeft = (ball.x + ball.radius) - b.x;
      const overlapRight = (b.x + b.w) - (ball.x - ball.radius);
      const overlapTop = (ball.y + ball.radius) - b.y;
      const overlapBottom = (b.y + b.h) - (ball.y - ball.radius);
      const minOverlapX = Math.min(overlapLeft, overlapRight);
      const minOverlapY = Math.min(overlapTop, overlapBottom);

      if (minOverlapX < minOverlapY) {
        ball.dx = -ball.dx;
      } else {
        ball.dy = -ball.dy;
      }

      if (b.hits > 0) {
        b.hits--;
        if (b.hits <= 0) {
          score += b.points;
          spawnParticles(b.x + b.w / 2, b.y + b.h / 2, b.color, 12);
          tryDropPowerup(b.x + b.w / 2, b.y + b.h / 2);
          bricks.splice(i, 1);
        } else {
          spawnParticles(b.x + b.w / 2, b.y + b.h / 2, b.color, 4);
        }
        AudioEngine.brickHit();
      } else if (b.hits === -1) {
        // Indestructible - just bounce
        AudioEngine.wallHit();
        spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#ffd700', 3);
      }
      updateHUD();
      return true;
    }
  }
  return false;
}

// ============ GAME LOOP ============
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (state === 'playing') {
    update(dt);
  } else if (state === 'waiting') {
    // Ball follows paddle
    const attached = balls.find(b => b.attached);
    if (attached) {
      attached.x = paddle.x + paddle.w / 2;
      attached.y = paddle.y - attached.radius;
    }
  }

  updateParticles(dt);
  if (shakeTimer > 0) {
    shakeTimer -= dt * 1000;
    shakeIntensity *= 0.92;
  }
  draw();

  animFrameId = requestAnimationFrame(gameLoop);
}

function update(dt) {
  const step = dt * 60; // normalize to 60fps

  // Update power-up timers
  for (const key in activePowerTimers) {
    activePowerTimers[key] -= dt;
    if (activePowerTimers[key] <= 0) {
      delete activePowerTimers[key];
      if (key === 'wide') {
        paddle.w = DIFF_SETTINGS[difficulty].paddleW;
        powerupIndEl.style.display = 'none';
      }
    }
  }

  // Update falling powerups
  for (let i = fallingPowerups.length - 1; i >= 0; i--) {
    const pu = fallingPowerups[i];
    pu.y += pu.vy * step;

    // Check paddle collision
    if (pu.y + pu.h >= paddle.y && pu.y <= paddle.y + paddle.h &&
        pu.x + pu.w / 2 >= paddle.x && pu.x - pu.w / 2 <= paddle.x + paddle.w) {
      applyPowerup(pu);
      spawnParticles(pu.x, pu.y, pu.color, 8);
      fallingPowerups.splice(i, 1);
      continue;
    }

    if (pu.y > CH) {
      fallingPowerups.splice(i, 1);
    }
  }

  // Update balls
  for (let i = balls.length - 1; i >= 0; i--) {
    const ball = balls[i];
    if (ball.attached) continue;

    ball.x += ball.dx * step;
    ball.y += ball.dy * step;

    // Wall collisions
    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.dx = Math.abs(ball.dx);
      AudioEngine.wallHit();
    }
    if (ball.x + ball.radius >= CW) {
      ball.x = CW - ball.radius;
      ball.dx = -Math.abs(ball.dx);
      AudioEngine.wallHit();
    }
    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.dy = Math.abs(ball.dy);
      AudioEngine.wallHit();
    }

    // Paddle collision
    if (ballPaddleCollision(ball)) {
      AudioEngine.paddleHit();
    }

    // Brick collision
    ballBrickCollision(ball);

    // Ball falls below
    if (ball.y - ball.radius > CH) {
      balls.splice(i, 1);
    }
  }

  // Check if all balls lost
  if (balls.length === 0) {
    lives--;
    updateHUD();
    if (lives <= 0) {
      onGameOver();
    } else {
      AudioEngine.die();
      shakeTimer = 200;
      shakeIntensity = 6;
      resetBall();
      state = 'waiting';
    }
  }

  // Check if level is cleared (all destructible bricks gone)
  const destructible = bricks.filter(b => b.hits > 0);
  if (destructible.length === 0 && bricks.filter(b => b.hits !== -1).length === 0 ||
      bricks.every(b => b.hits === -1)) {
    // Level complete if no destructible bricks remain
    if (bricks.length === 0 || bricks.every(b => b.hits === -1)) {
      onLevelComplete();
    }
  }
}

function onGameOver() {
  state = 'dead';
  AudioEngine.die();
  shakeTimer = 300;
  shakeIntensity = 8;

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('breakoutHighScore', highScore.toString());
  }

  setTimeout(() => {
    deathEl.style.display = 'flex';
    finalScoreEl.textContent = score;
    if (score >= highScore && score > 0) {
      newHighLabel.style.display = 'block';
    } else {
      newHighLabel.style.display = 'none';
    }
  }, 400);
}

function onLevelComplete() {
  state = 'levelComplete';
  AudioEngine.levelUp();
  level++;
  updateHUD();
  nextLevelVal.textContent = level;
  levelCompleteEl.style.display = 'flex';

  setTimeout(() => {
    startLevel();
  }, 2000);
}

// ============ DRAWING ============
function draw() {
  const ox = shakeTimer > 0 ? (Math.random() - 0.5) * shakeIntensity : 0;
  const oy = shakeTimer > 0 ? (Math.random() - 0.5) * shakeIntensity : 0;

  ctx2d.save();
  ctx2d.translate(ox, oy);

  // Background
  ctx2d.fillStyle = '#0f1123';
  ctx2d.fillRect(0, 0, CW, CH);

  // Subtle grid
  ctx2d.strokeStyle = 'rgba(255,255,255,0.015)';
  ctx2d.lineWidth = 0.5;
  for (let i = 0; i < CW; i += 30) {
    ctx2d.beginPath(); ctx2d.moveTo(i, 0); ctx2d.lineTo(i, CH); ctx2d.stroke();
  }
  for (let j = 0; j < CH; j += 30) {
    ctx2d.beginPath(); ctx2d.moveTo(0, j); ctx2d.lineTo(CW, j); ctx2d.stroke();
  }

  // Border glow
  ctx2d.shadowColor = '#e94560';
  ctx2d.shadowBlur = 10;
  ctx2d.strokeStyle = 'rgba(233,69,96,0.3)';
  ctx2d.lineWidth = 2;
  ctx2d.strokeRect(0, 0, CW, CH);
  ctx2d.shadowBlur = 0;

  // Draw bricks
  bricks.forEach(b => {
    const alpha = b.hits === -1 ? 1 : (b.maxHits > 0 ? 0.4 + 0.6 * (b.hits / b.maxHits) : 1);
    ctx2d.globalAlpha = alpha;

    // Glow for multi-hit bricks
    if (b.hits > 1 || b.hits === -1) {
      ctx2d.shadowColor = b.color;
      ctx2d.shadowBlur = 8;
    }

    ctx2d.fillStyle = b.color;
    roundRect(b.x, b.y, b.w, b.h, 3);

    // Shine
    ctx2d.fillStyle = 'rgba(255,255,255,0.15)';
    ctx2d.fillRect(b.x + 2, b.y + 1, b.w - 4, b.h / 3);

    // Indestructible marker
    if (b.hits === -1) {
      ctx2d.fillStyle = 'rgba(0,0,0,0.3)';
      ctx2d.font = 'bold 10px Segoe UI';
      ctx2d.textAlign = 'center';
      ctx2d.textBaseline = 'middle';
      ctx2d.fillText('X', b.x + b.w / 2, b.y + b.h / 2);
    } else if (b.hits > 1) {
      ctx2d.fillStyle = 'rgba(255,255,255,0.6)';
      ctx2d.font = 'bold 10px Segoe UI';
      ctx2d.textAlign = 'center';
      ctx2d.textBaseline = 'middle';
      ctx2d.fillText(b.hits, b.x + b.w / 2, b.y + b.h / 2);
    }

    ctx2d.shadowBlur = 0;
    ctx2d.globalAlpha = 1;
  });

  // Draw paddle
  ctx2d.shadowColor = '#e94560';
  ctx2d.shadowBlur = 12;
  ctx2d.fillStyle = '#e94560';
  roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 4);
  ctx2d.shadowBlur = 0;

  // Paddle shine
  ctx2d.fillStyle = 'rgba(255,255,255,0.15)';
  ctx2d.fillRect(paddle.x + 3, paddle.y + 1, paddle.w - 6, paddle.h / 3);

  // Draw balls
  balls.forEach(ball => {
    ctx2d.shadowColor = '#fff';
    ctx2d.shadowBlur = 10;
    ctx2d.fillStyle = '#fff';
    ctx2d.beginPath();
    ctx2d.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.shadowBlur = 0;

    // Ball shine
    ctx2d.fillStyle = 'rgba(255,255,255,0.4)';
    ctx2d.beginPath();
    ctx2d.arc(ball.x - 1.5, ball.y - 1.5, ball.radius * 0.4, 0, Math.PI * 2);
    ctx2d.fill();
  });

  // Draw falling powerups
  fallingPowerups.forEach(pu => {
    const flash = 0.7 + Math.sin(Date.now() * 0.008) * 0.3;
    ctx2d.globalAlpha = flash;
    ctx2d.shadowColor = pu.color;
    ctx2d.shadowBlur = 10;
    ctx2d.fillStyle = pu.color;
    roundRect(pu.x - pu.w / 2, pu.y, pu.w, pu.h, 3);
    ctx2d.shadowBlur = 0;
    ctx2d.globalAlpha = 1;

    ctx2d.fillStyle = '#000';
    ctx2d.font = 'bold 9px Segoe UI';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText(pu.name, pu.x, pu.y + pu.h / 2);
  });

  // Particles
  particles.forEach(p => {
    ctx2d.globalAlpha = p.life;
    ctx2d.fillStyle = p.color;
    ctx2d.beginPath();
    ctx2d.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx2d.fill();
  });
  ctx2d.globalAlpha = 1;

  // "Click to launch" indicator
  if (state === 'waiting') {
    ctx2d.fillStyle = 'rgba(233,69,96,0.6)';
    ctx2d.font = '16px Segoe UI';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('Click or press Space to launch', CW / 2, CH / 2 + 40);
  }

  ctx2d.restore();
}

function roundRect(x, y, w, h, r) {
  ctx2d.beginPath();
  ctx2d.moveTo(x + r, y);
  ctx2d.lineTo(x + w - r, y);
  ctx2d.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx2d.lineTo(x + w, y + h - r);
  ctx2d.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx2d.lineTo(x + r, y + h);
  ctx2d.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx2d.lineTo(x, y + r);
  ctx2d.quadraticCurveTo(x, y, x + r, y);
  ctx2d.closePath();
  ctx2d.fill();
}

// ============ CONTROLS ============
function launchBall() {
  if (state !== 'waiting') return;
  const attached = balls.find(b => b.attached);
  if (attached) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    attached.dx = Math.cos(angle) * attached.speed;
    attached.dy = Math.sin(angle) * attached.speed;
    attached.attached = false;
    state = 'playing';
    AudioEngine.launch();
  }
}

function pauseGame() {
  if (state !== 'playing' && state !== 'waiting') return;
  state = 'paused';
  pauseEl.style.display = 'flex';
}

function resumeGame() {
  if (state !== 'paused') return;
  // Determine if we were waiting or playing
  const hasMovingBall = balls.some(b => !b.attached);
  state = hasMovingBall ? 'playing' : 'waiting';
  pauseEl.style.display = 'none';
  lastTime = performance.now();
}

// Mouse / Touch paddle control
let canvasRect = canvas.getBoundingClientRect();
window.addEventListener('resize', () => { canvasRect = canvas.getBoundingClientRect(); });

function movePaddle(clientX) {
  if (state !== 'playing' && state !== 'waiting') return;
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  paddle.x = Math.max(0, Math.min(CW - paddle.w, x - paddle.w / 2));
}

canvas.addEventListener('mousemove', e => {
  movePaddle(e.clientX);
});

canvas.addEventListener('click', e => {
  movePaddle(e.clientX);
  launchBall();
});

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  movePaddle(e.touches[0].clientX);
}, { passive: false });

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  movePaddle(e.touches[0].clientX);
  launchBall();
}, { passive: false });

document.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();

  if (key === ' ' || key === 'spacebar') {
    e.preventDefault();
    launchBall();
  }
  if (key === 'p') {
    if (state === 'paused') resumeGame();
    else pauseGame();
  }
  if (key === 'escape') {
    if (state !== 'menu' && state !== 'dead') showMenu();
  }
  // Arrow keys for paddle as alternative
  if (key === 'arrowleft' || key === 'a') {
    paddle.x = Math.max(0, paddle.x - 20);
    e.preventDefault();
  }
  if (key === 'arrowright' || key === 'd') {
    paddle.x = Math.min(CW - paddle.w, paddle.x + 20);
    e.preventDefault();
  }
});

// ============ INITIAL STATE ============
ctx2d.fillStyle = '#0a0a1a';
ctx2d.fillRect(0, 0, canvas.width, canvas.height);
