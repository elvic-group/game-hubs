// ============ LAUNCH ============
function launch(path) {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    window.location.href = chrome.runtime.getURL(path);
  } else {
    window.location.href = path;
  }
}

// ============ EVENT LISTENERS FOR GAME CARDS ============
document.querySelectorAll('.game-card[data-game]').forEach(function(card) {
  card.addEventListener('click', function() {
    launch(card.getAttribute('data-game'));
  });
});

// ============ SPONSOR & LEGAL LINKS ============
['sponsorLink', 'termsLink', 'privacyLink'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      launch(el.getAttribute('href'));
    });
  }
});

// ============ BACKGROUND PARTICLES ============
const bg = document.getElementById('bgCanvas');
const bgCtx = bg.getContext('2d');
let bgParticles = [];

function resizeBg() { bg.width = window.innerWidth; bg.height = window.innerHeight; }
resizeBg();
window.addEventListener('resize', resizeBg);

for (let i = 0; i < 40; i++) {
  bgParticles.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: 1 + Math.random() * 2,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    alpha: 0.1 + Math.random() * 0.2
  });
}

function animBg() {
  bgCtx.clearRect(0, 0, bg.width, bg.height);
  bgParticles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = bg.width;
    if (p.x > bg.width) p.x = 0;
    if (p.y < 0) p.y = bg.height;
    if (p.y > bg.height) p.y = 0;
    bgCtx.fillStyle = `rgba(233,69,96,${p.alpha})`;
    bgCtx.beginPath();
    bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    bgCtx.fill();
  });
  requestAnimationFrame(animBg);
}
animBg();

// ============ CARD PREVIEW ANIMATIONS ============

// Snake preview
(() => {
  const cv = document.getElementById('previewSnake');
  const ctx = cv.getContext('2d');
  cv.width = 300; cv.height = 160;
  const g = 10;
  let snake = [];
  let dir = { x: 1, y: 0 };
  let food = {};
  const cols = cv.width / g, rows = cv.height / g;

  for (let i = 0; i < 6; i++) snake.push({ x: 10 - i, y: 8 });
  placeFood();

  function placeFood() {
    food = { x: Math.floor(Math.random() * (cols - 4)) + 2, y: Math.floor(Math.random() * (rows - 4)) + 2 };
  }

  function tick() {
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0) head.x = cols - 1;
    if (head.x >= cols) head.x = 0;
    if (head.y < 0) head.y = rows - 1;
    if (head.y >= rows) head.y = 0;

    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      snake = [{ x: 10, y: 8 }];
      for (let i = 1; i < 6; i++) snake.push({ x: 10 - i, y: 8 });
      dir = { x: 1, y: 0 };
      placeFood();
      return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) { placeFood(); }
    else { snake.pop(); }

    const dx = food.x - head.x, dy = food.y - head.y;
    if (Math.random() < 0.3) {
      if (Math.abs(dx) > Math.abs(dy)) dir = { x: Math.sign(dx), y: 0 };
      else dir = { x: 0, y: Math.sign(dy) || 1 };
    }
  }

  function draw() {
    ctx.fillStyle = '#0f1123';
    ctx.fillRect(0, 0, cv.width, cv.height);
    snake.forEach((s, i) => {
      const t = i / snake.length;
      ctx.fillStyle = i === 0 ? '#e94560' : `hsl(348, ${80 - t*20}%, ${50 - t*15}%)`;
      ctx.fillRect(s.x * g + 1, s.y * g + 1, g - 2, g - 2);
    });
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.arc(food.x * g + g/2, food.y * g + g/2, g/2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  setInterval(() => { tick(); draw(); }, 120);
  draw();
})();

// Tic-Tac-Toe preview
(() => {
  const cv = document.getElementById('previewTTT');
  const ctx = cv.getContext('2d');
  cv.width = 300; cv.height = 160;
  let board = Array(9).fill(null);
  let turn = 'X';
  let step = 0;

  function reset() { board = Array(9).fill(null); turn = 'X'; step = 0; }

  function tick() {
    const empty = board.map((v,i) => v === null ? i : -1).filter(i => i >= 0);
    if (empty.length === 0) { setTimeout(reset, 1000); return; }
    const pick = empty[Math.floor(Math.random() * empty.length)];
    board[pick] = turn;
    turn = turn === 'X' ? 'O' : 'X';
    step++;
    if (step >= 9) setTimeout(reset, 1200);
  }

  function draw() {
    ctx.fillStyle = '#0f1123';
    ctx.fillRect(0, 0, cv.width, cv.height);
    const ox = 90, oy = 10, sz = 40, gap = 6;

    ctx.strokeStyle = 'rgba(233,69,96,0.2)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(ox + i * (sz + gap) - gap/2, oy); ctx.lineTo(ox + i * (sz + gap) - gap/2, oy + 3 * sz + 2 * gap); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, oy + i * (sz + gap) - gap/2); ctx.lineTo(ox + 3 * sz + 2 * gap, oy + i * (sz + gap) - gap/2); ctx.stroke();
    }

    board.forEach((v, i) => {
      if (!v) return;
      const col = i % 3, row = Math.floor(i / 3);
      const cx = ox + col * (sz + gap) + sz/2;
      const cy = oy + row * (sz + gap) + sz/2;
      const pad = 8;
      if (v === 'X') {
        ctx.strokeStyle = '#e94560'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx - sz/2 + pad, cy - sz/2 + pad); ctx.lineTo(cx + sz/2 - pad, cy + sz/2 - pad); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + sz/2 - pad, cy - sz/2 + pad); ctx.lineTo(cx - sz/2 + pad, cy + sz/2 - pad); ctx.stroke();
      } else {
        ctx.strokeStyle = '#4a90d9'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, sz/2 - pad, 0, Math.PI * 2); ctx.stroke();
      }
    });
  }

  setInterval(() => { tick(); draw(); }, 600);
  draw();
})();

// Pong preview
(() => {
  const cv = document.getElementById('previewPong');
  const ctx = cv.getContext('2d');
  cv.width = 300; cv.height = 160;
  const pw = 6, ph = 36;
  let p1y = 62, p2y = 62;
  let bx = 150, by = 80, bvx = 2.5, bvy = 1.5;

  function tick() {
    bx += bvx; by += bvy;
    if (by < 4 || by > 156) bvy *= -1;
    if (bx < 22 && by > p1y && by < p1y + ph) { bvx = Math.abs(bvx); }
    if (bx > 272 && by > p2y && by < p2y + ph) { bvx = -Math.abs(bvx); }
    if (bx < 0 || bx > 300) { bx = 150; by = 80; bvx = (Math.random() > 0.5 ? 2.5 : -2.5); bvy = (Math.random() - 0.5) * 3; }

    p1y += (by - p1y - ph/2) * 0.08;
    p2y += (by - p2y - ph/2) * 0.08;
    p1y = Math.max(0, Math.min(160 - ph, p1y));
    p2y = Math.max(0, Math.min(160 - ph, p2y));
  }

  function draw() {
    ctx.fillStyle = '#0f1123';
    ctx.fillRect(0, 0, 300, 160);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.moveTo(150, 0); ctx.lineTo(150, 160); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e94560';
    ctx.fillRect(14, p1y, pw, ph);
    ctx.fillStyle = '#4a90d9';
    ctx.fillRect(280, p2y, pw, ph);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
  }

  setInterval(() => { tick(); draw(); }, 20);
  draw();
})();
