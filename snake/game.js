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
    eat() { play(600, 'sine', 0.1); setTimeout(() => play(800, 'sine', 0.1), 50); },
    powerup() { play(400, 'square', 0.08, 0.1); setTimeout(() => play(600, 'square', 0.08, 0.1), 60); setTimeout(() => play(900, 'square', 0.15, 0.1), 120); },
    die() { play(200, 'sawtooth', 0.3, 0.12); setTimeout(() => play(100, 'sawtooth', 0.4, 0.1), 100); },
    move() { play(300, 'sine', 0.03, 0.03); },
    countdown() { play(440, 'sine', 0.15, 0.1); },
    countdownGo() { play(880, 'sine', 0.25, 0.15); },
  };
})();

// ============ CANVAS SETUP ============
const canvas = document.getElementById('gameCanvas');
const ctx2d = canvas.getContext('2d');
const GRID = 20;
let COLS, ROWS;

function resizeCanvas() {
  const maxW = Math.min(window.innerWidth - 20, 600);
  const maxH = Math.min(window.innerHeight - 140, 600);
  const size = Math.min(maxW, maxH);
  COLS = Math.floor(size / GRID);
  ROWS = Math.floor(size / GRID);
  canvas.width = COLS * GRID;
  canvas.height = ROWS * GRID;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ============ GAME STATE ============
let snake, dir, nextDir, food, score, level, gameOver, paused, gameLoop;
let particles = [];
let shakeTimer = 0, shakeIntensity = 0;
let highScore = parseInt(localStorage.getItem('snakeHighScore') || '0');
let difficulty = 'normal';
let wallWrap = false;
let powerup = null;
let powerupTimer = 0;
let activePower = null;
let activePowerTimer = 0;
let foodEaten = 0;
let baseSpeed = { easy: 130, normal: 100, hard: 70 };
let speedIncrease = { easy: 1, normal: 2, hard: 3 };

const FOOD_TYPES = [
  { color: '#e94560', glow: 'rgba(233,69,96,0.4)', points: 10, chance: 0.7 },
  { color: '#ffd700', glow: 'rgba(255,215,0,0.4)', points: 30, chance: 0.2 },
  { color: '#00ff88', glow: 'rgba(0,255,136,0.4)', points: 50, chance: 0.1 },
];

const POWERUP_TYPES = [
  { name: 'SLOW-MO', color: '#00bfff', duration: 5000, effect: 'slow' },
  { name: '2X SCORE', color: '#ffd700', duration: 6000, effect: 'double' },
  { name: 'SHRINK', color: '#ff69b4', duration: 0, effect: 'shrink' },
];

// ============ UI REFERENCES ============
const menuEl = document.getElementById('menu');
const hudEl = document.getElementById('hud');
const pauseEl = document.getElementById('pauseOverlay');
const deathEl = document.getElementById('deathOverlay');
const countdownEl = document.getElementById('countdown');
const powerupIndEl = document.getElementById('powerupIndicator');
const scoreVal = document.getElementById('scoreVal');
const levelVal = document.getElementById('levelVal');
const highVal = document.getElementById('highVal');
const finalScoreEl = document.getElementById('finalScore');
const newHighLabel = document.getElementById('newHighLabel');
const menuHighScore = document.getElementById('menuHighScore');

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

document.getElementById('wallWrapToggle').addEventListener('click', function() {
  this.classList.toggle('on');
  wallWrap = this.classList.contains('on');
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
document.getElementById('infoBtn').addEventListener('click', () => {
  menuEl.style.display = 'none';
  document.getElementById('infoOverlay').style.display = 'flex';
});
document.getElementById('infoCloseBtn').addEventListener('click', () => {
  document.getElementById('infoOverlay').style.display = 'none';
  menuEl.style.display = 'flex';
});

// Back to Game Hubs button
document.getElementById('hubBtn').addEventListener('click', function() {
  if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
    window.location.href = chrome.runtime.getURL('index.html');
  } else {
    window.location.href = '../index.html';
  }
});

function showMenu() {
  clearInterval(gameLoop);
  menuEl.style.display = 'flex';
  hudEl.style.display = 'none';
  pauseEl.style.display = 'none';
  deathEl.style.display = 'none';
  menuHighScore.textContent = highScore;
  ctx2d.fillStyle = '#0a0a1a';
  ctx2d.fillRect(0, 0, canvas.width, canvas.height);
}

// ============ GAME INIT ============
function startGame() {
  menuEl.style.display = 'none';
  deathEl.style.display = 'none';
  pauseEl.style.display = 'none';
  hudEl.style.display = 'flex';
  powerupIndEl.style.display = 'none';

  resizeCanvas();
  const cx = Math.floor(COLS / 2), cy = Math.floor(ROWS / 2);
  snake = [{x: cx, y: cy}, {x: cx-1, y: cy}, {x: cx-2, y: cy}];
  dir = {x: 1, y: 0};
  nextDir = {x: 1, y: 0};
  score = 0; level = 1; gameOver = false; paused = false;
  particles = []; shakeTimer = 0; powerup = null;
  activePower = null; activePowerTimer = 0; foodEaten = 0;
  scoreVal.textContent = '0';
  levelVal.textContent = '1';
  highVal.textContent = highScore;
  placeFood();

  // Countdown
  clearInterval(gameLoop);
  let count = 3;
  countdownEl.style.display = 'block';
  countdownEl.textContent = count;
  draw();
  AudioEngine.countdown();

  const cdInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
      AudioEngine.countdown();
    } else {
      countdownEl.textContent = 'GO!';
      AudioEngine.countdownGo();
      setTimeout(() => {
        countdownEl.style.display = 'none';
        gameLoop = setInterval(update, getSpeed());
      }, 300);
      clearInterval(cdInterval);
    }
  }, 600);
}

function getSpeed() {
  let speed = baseSpeed[difficulty] - (level - 1) * speedIncrease[difficulty] * 3;
  if (activePower && activePower.effect === 'slow') speed *= 1.6;
  return Math.max(40, speed);
}

// ============ FOOD & POWERUP PLACEMENT ============
function placeFood() {
  const r = Math.random();
  let cumulative = 0;
  let type = FOOD_TYPES[0];
  for (const ft of FOOD_TYPES) {
    cumulative += ft.chance;
    if (r < cumulative) { type = ft; break; }
  }
  let pos;
  do {
    pos = {x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS)};
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = { ...pos, ...type };
}

function trySpawnPowerup() {
  if (powerup || Math.random() > 0.25) return;
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  let pos;
  do {
    pos = {x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS)};
  } while (snake.some(s => s.x === pos.x && s.y === pos.y) || (pos.x === food.x && pos.y === food.y));
  powerup = { ...pos, ...type };
  powerupTimer = 8000;
}

// ============ PARTICLES ============
function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const speed = 1.5 + Math.random() * 2.5;
    particles.push({
      x: x * GRID + GRID/2, y: y * GRID + GRID/2,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 1, decay: 0.02 + Math.random() * 0.02,
      size: 2 + Math.random() * 3, color
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.96; p.vy *= 0.96;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ============ GAME UPDATE ============
function update() {
  if (gameOver || paused) return;

  dir = nextDir;
  let head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

  // Wall wrap
  if (wallWrap) {
    if (head.x < 0) head.x = COLS - 1;
    if (head.x >= COLS) head.x = 0;
    if (head.y < 0) head.y = ROWS - 1;
    if (head.y >= ROWS) head.y = 0;
  }

  // Collision check
  const hitWall = !wallWrap && (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS);
  const hitSelf = snake.some(s => s.x === head.x && s.y === head.y);

  if (hitWall || hitSelf) {
    gameOver = true;
    shakeTimer = 300; shakeIntensity = 8;
    AudioEngine.die();
    spawnParticles(snake[0].x, snake[0].y, '#e94560', 20);

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('snakeHighScore', highScore.toString());
    }

    setTimeout(() => {
      deathEl.style.display = 'flex';
      finalScoreEl.textContent = score;
      if (score >= highScore && score > 0) {
        newHighLabel.style.display = 'block';
      } else {
        newHighLabel.style.display = 'none';
      }
    }, 600);

    clearInterval(gameLoop);
    animateDeath();
    return;
  }

  snake.unshift(head);

  // Eat food
  if (head.x === food.x && head.y === food.y) {
    let points = food.points;
    if (activePower && activePower.effect === 'double') points *= 2;
    score += points;
    foodEaten++;
    scoreVal.textContent = score;
    highVal.textContent = Math.max(score, highScore);

    const newLevel = Math.floor(foodEaten / 5) + 1;
    if (newLevel !== level) {
      level = newLevel;
      levelVal.textContent = level;
      clearInterval(gameLoop);
      gameLoop = setInterval(update, getSpeed());
    }

    AudioEngine.eat();
    spawnParticles(food.x, food.y, food.color, 10);
    placeFood();
    trySpawnPowerup();
  } else {
    snake.pop();
  }

  // Eat powerup
  if (powerup && head.x === powerup.x && head.y === powerup.y) {
    AudioEngine.powerup();
    spawnParticles(powerup.x, powerup.y, powerup.color, 15);

    if (powerup.effect === 'shrink') {
      const remove = Math.min(3, snake.length - 3);
      for (let i = 0; i < remove; i++) snake.pop();
    } else {
      activePower = powerup;
      activePowerTimer = powerup.duration;
      powerupIndEl.style.display = 'block';
      powerupIndEl.textContent = powerup.name;
      powerupIndEl.style.background = powerup.color;
      powerupIndEl.style.color = '#000';
      clearInterval(gameLoop);
      gameLoop = setInterval(update, getSpeed());
    }
    powerup = null;
  }

  // Timers
  if (powerup) {
    powerupTimer -= getSpeed();
    if (powerupTimer <= 0) powerup = null;
  }
  if (activePower) {
    activePowerTimer -= getSpeed();
    if (activePowerTimer <= 0) {
      activePower = null;
      powerupIndEl.style.display = 'none';
      clearInterval(gameLoop);
      gameLoop = setInterval(update, getSpeed());
    }
  }

  updateParticles();
  draw();
}

// ============ DRAWING ============
function draw() {
  const ox = shakeTimer > 0 ? (Math.random() - 0.5) * shakeIntensity : 0;
  const oy = shakeTimer > 0 ? (Math.random() - 0.5) * shakeIntensity : 0;
  if (shakeTimer > 0) { shakeTimer -= 16; shakeIntensity *= 0.92; }

  ctx2d.save();
  ctx2d.translate(ox, oy);

  // Background
  ctx2d.fillStyle = '#0f1123';
  ctx2d.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx2d.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx2d.lineWidth = 0.5;
  for (let i = 0; i <= COLS; i++) {
    ctx2d.beginPath(); ctx2d.moveTo(i * GRID, 0); ctx2d.lineTo(i * GRID, canvas.height); ctx2d.stroke();
  }
  for (let j = 0; j <= ROWS; j++) {
    ctx2d.beginPath(); ctx2d.moveTo(0, j * GRID); ctx2d.lineTo(canvas.width, j * GRID); ctx2d.stroke();
  }

  // Border glow
  if (!wallWrap) {
    ctx2d.shadowColor = '#e94560';
    ctx2d.shadowBlur = 10;
    ctx2d.strokeStyle = 'rgba(233,69,96,0.3)';
    ctx2d.lineWidth = 2;
    ctx2d.strokeRect(0, 0, canvas.width, canvas.height);
    ctx2d.shadowBlur = 0;
  }

  // Food glow
  ctx2d.shadowColor = food.glow;
  ctx2d.shadowBlur = 15;
  ctx2d.fillStyle = food.color;
  ctx2d.beginPath();
  const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.15;
  ctx2d.arc(food.x * GRID + GRID/2, food.y * GRID + GRID/2, GRID/2.5 * pulse, 0, Math.PI * 2);
  ctx2d.fill();
  ctx2d.shadowBlur = 0;

  // Powerup
  if (powerup) {
    const flash = 0.6 + Math.sin(Date.now() * 0.008) * 0.4;
    ctx2d.globalAlpha = flash;
    ctx2d.shadowColor = powerup.color;
    ctx2d.shadowBlur = 20;
    ctx2d.fillStyle = powerup.color;

    // Diamond shape
    const px = powerup.x * GRID + GRID/2, py = powerup.y * GRID + GRID/2;
    ctx2d.beginPath();
    ctx2d.moveTo(px, py - GRID/2.5);
    ctx2d.lineTo(px + GRID/2.5, py);
    ctx2d.lineTo(px, py + GRID/2.5);
    ctx2d.lineTo(px - GRID/2.5, py);
    ctx2d.closePath();
    ctx2d.fill();

    ctx2d.shadowBlur = 0;
    ctx2d.globalAlpha = 1;

    // Label
    ctx2d.fillStyle = '#fff';
    ctx2d.font = '9px Segoe UI';
    ctx2d.textAlign = 'center';
    ctx2d.fillText(powerup.name, px, py - GRID/1.5);
  }

  // Snake
  snake.forEach((seg, i) => {
    const t = i / Math.max(snake.length - 1, 1);
    const hue = 348;
    const sat = 80 - t * 20;
    const light = 50 - t * 15;

    if (i === 0) {
      // Head with glow
      ctx2d.shadowColor = '#e94560';
      ctx2d.shadowBlur = 12;
      ctx2d.fillStyle = '#e94560';
    } else {
      ctx2d.shadowBlur = 0;
      ctx2d.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
    }

    const r = i === 0 ? 4 : 3;
    roundRect(seg.x * GRID + 1, seg.y * GRID + 1, GRID - 2, GRID - 2, r);

    // Shine
    ctx2d.fillStyle = 'rgba(255,255,255,0.08)';
    ctx2d.fillRect(seg.x * GRID + 2, seg.y * GRID + 2, GRID - 4, (GRID - 4) / 3);

    // Eyes on head
    if (i === 0) {
      ctx2d.shadowBlur = 0;
      ctx2d.fillStyle = '#fff';
      const ex1 = seg.x * GRID + GRID/2 + dir.x * 3 - dir.y * 3;
      const ey1 = seg.y * GRID + GRID/2 + dir.y * 3 - dir.x * 3;
      const ex2 = seg.x * GRID + GRID/2 + dir.x * 3 + dir.y * 3;
      const ey2 = seg.y * GRID + GRID/2 + dir.y * 3 + dir.x * 3;
      ctx2d.beginPath(); ctx2d.arc(ex1, ey1, 2.5, 0, Math.PI * 2); ctx2d.fill();
      ctx2d.beginPath(); ctx2d.arc(ex2, ey2, 2.5, 0, Math.PI * 2); ctx2d.fill();
      ctx2d.fillStyle = '#0f1123';
      ctx2d.beginPath(); ctx2d.arc(ex1 + dir.x, ey1 + dir.y, 1.2, 0, Math.PI * 2); ctx2d.fill();
      ctx2d.beginPath(); ctx2d.arc(ex2 + dir.x, ey2 + dir.y, 1.2, 0, Math.PI * 2); ctx2d.fill();
    }
  });

  ctx2d.shadowBlur = 0;

  // Particles
  particles.forEach(p => {
    ctx2d.globalAlpha = p.life;
    ctx2d.fillStyle = p.color;
    ctx2d.beginPath();
    ctx2d.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx2d.fill();
  });
  ctx2d.globalAlpha = 1;

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

function animateDeath() {
  let frames = 0;
  function deathFrame() {
    if (frames > 30) return;
    updateParticles();
    draw();
    frames++;
    requestAnimationFrame(deathFrame);
  }
  deathFrame();
}

// ============ CONTROLS ============
function pauseGame() {
  if (gameOver) return;
  paused = true;
  pauseEl.style.display = 'flex';
}

function resumeGame() {
  paused = false;
  pauseEl.style.display = 'none';
}

function handleDirection(newDir) {
  if (gameOver || paused) return;
  if (newDir === 'up' && dir.y !== 1) nextDir = {x: 0, y: -1};
  if (newDir === 'down' && dir.y !== -1) nextDir = {x: 0, y: 1};
  if (newDir === 'left' && dir.x !== 1) nextDir = {x: -1, y: 0};
  if (newDir === 'right' && dir.x !== -1) nextDir = {x: 1, y: 0};
}

document.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  if (key === 'arrowup' || key === 'w') { handleDirection('up'); e.preventDefault(); }
  if (key === 'arrowdown' || key === 's') { handleDirection('down'); e.preventDefault(); }
  if (key === 'arrowleft' || key === 'a') { handleDirection('left'); e.preventDefault(); }
  if (key === 'arrowright' || key === 'd') { handleDirection('right'); e.preventDefault(); }
  if (key === 'p') { paused ? resumeGame() : pauseGame(); }
  if (key === 'escape') { if (!gameOver) showMenu(); }
});

// Mobile d-pad
document.querySelectorAll('.dpad-btn').forEach(btn => {
  btn.addEventListener('touchstart', e => {
    e.preventDefault();
    const d = btn.dataset.dir;
    if (d === 'pause') { paused ? resumeGame() : pauseGame(); }
    else handleDirection(d);
  });
});

// Swipe controls
let touchStartX, touchStartY;
canvas.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});
canvas.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    handleDirection(dx > 0 ? 'right' : 'left');
  } else {
    handleDirection(dy > 0 ? 'down' : 'up');
  }
});

// Initial draw
ctx2d.fillStyle = '#0a0a1a';
ctx2d.fillRect(0, 0, canvas.width, canvas.height);
