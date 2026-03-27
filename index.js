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

// Tetris preview
(() => {
  const cv = document.getElementById('previewTetris');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  cv.width = 300; cv.height = 160;
  const g = 12, cols = 10, rows = 13;
  const ox = (300 - cols * g) / 2, oy = 2;
  const colors = ['#e94560','#4a90d9','#ffd700','#00ff88','#ff69b4','#00bfff','#ff8c00'];
  let grid = Array.from({length: rows}, () => Array(cols).fill(0));
  let tick = 0;

  function draw() {
    ctx.fillStyle = '#0f1123';
    ctx.fillRect(0, 0, 300, 160);
    // Fill some bottom rows randomly
    tick++;
    if (tick % 15 === 0) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.6) grid[rows-1][c] = Math.floor(Math.random()*7)+1;
      }
      // Shift rows up
      for (let r = 0; r < rows-1; r++) grid[r] = grid[r+1].slice();
      grid[rows-1] = Array(cols).fill(0);
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (grid[r][c]) {
        ctx.fillStyle = colors[grid[r][c]-1];
        ctx.fillRect(ox + c*g+1, oy + r*g+1, g-2, g-2);
      }
    }
    // Falling piece
    const px = Math.floor(cols/2)-1, py = (tick % 12);
    ctx.fillStyle = '#e94560';
    ctx.fillRect(ox+px*g+1, oy+py*g+1, g-2, g-2);
    ctx.fillRect(ox+(px+1)*g+1, oy+py*g+1, g-2, g-2);
    ctx.fillRect(ox+px*g+1, oy+(py+1)*g+1, g-2, g-2);
    ctx.fillRect(ox+(px+1)*g+1, oy+(py+1)*g+1, g-2, g-2);
  }
  setInterval(draw, 80);
  draw();
})();

// Breakout preview
(() => {
  const cv = document.getElementById('previewBreakout');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  cv.width = 300; cv.height = 160;
  let bx = 150, by = 120, bvx = 2.2, bvy = -2.2;
  let px = 130;
  const pw = 50, ph = 6;
  const bricks = [];
  const colors = ['#e94560','#ff8c00','#ffd700','#00ff88','#4a90d9'];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
    bricks.push({x: 10+c*35, y: 10+r*14, w: 32, h: 10, alive: true, color: colors[r]});
  }

  function draw() {
    bx += bvx; by += bvy;
    if (bx < 4 || bx > 296) bvx *= -1;
    if (by < 4) bvy *= -1;
    if (by > 150) { bvy = -Math.abs(bvy); by = 120; }
    px += (bx - px - pw/2) * 0.1;
    // Brick collision
    bricks.forEach(b => {
      if (b.alive && bx > b.x && bx < b.x+b.w && by > b.y && by < b.y+b.h) {
        b.alive = false; bvy *= -1;
        setTimeout(() => b.alive = true, 3000);
      }
    });
    ctx.fillStyle = '#0f1123';
    ctx.fillRect(0, 0, 300, 160);
    bricks.forEach(b => { if (b.alive) { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h); }});
    ctx.fillStyle = '#e94560';
    ctx.fillRect(px, 148, pw, ph);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI*2); ctx.fill();
  }
  setInterval(draw, 20);
  draw();
})();

// Flappy Bird preview
(() => {
  const cv = document.getElementById('previewFlappy');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  cv.width = 300; cv.height = 160;
  let by = 80, bvy = 0;
  let pipes = [{x: 200, gap: 60}, {x: 350, gap: 70}];
  let tick = 0;

  function draw() {
    tick++;
    bvy += 0.3;
    by += bvy;
    if (by > 140 || by < 10) { by = 80; bvy = -3; }
    if (tick % 40 === 0) bvy = -4;

    pipes.forEach(p => { p.x -= 1.5; if (p.x < -30) { p.x = 320; p.gap = 50 + Math.random()*40; }});

    ctx.fillStyle = '#0f1123';
    ctx.fillRect(0, 0, 300, 160);
    // Pipes
    pipes.forEach(p => {
      const gapY = 50 + Math.sin(p.x*0.01)*30;
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(p.x, 0, 24, gapY);
      ctx.fillRect(p.x, gapY + p.gap, 24, 160);
    });
    // Bird
    ctx.fillStyle = '#e94560';
    ctx.beginPath(); ctx.arc(60, by, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(63, by-2, 2, 0, Math.PI*2); ctx.fill();
  }
  setInterval(draw, 25);
  draw();
})();

// 2048 preview
(() => {
  const cv = document.getElementById('preview2048');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  cv.width = 300; cv.height = 160;
  const vals = [0,2,4,8,16,32,64,128,256,512,1024,2048];
  const tileColors = {0:'#1a1a2e',2:'#2a2040',4:'#352850',8:'#e94560',16:'#d63851',32:'#c62b42',64:'#b51e33',128:'#4a90d9',256:'#3d7ec4',512:'#3070b0',1024:'#ffd700',2048:'#ffec8b'};
  let grid = Array(16).fill(0);
  grid[5]=2; grid[6]=4; grid[9]=8; grid[10]=16; grid[13]=64; grid[14]=128; grid[15]=256;
  let tick = 0;

  function draw() {
    tick++;
    if (tick % 30 === 0) {
      const empty = grid.map((v,i) => v===0?i:-1).filter(i=>i>=0);
      if (empty.length) grid[empty[Math.floor(Math.random()*empty.length)]] = vals[Math.floor(Math.random()*5)+1];
    }
    if (tick % 60 === 0) { grid = Array(16).fill(0); }

    ctx.fillStyle = '#0f1123';
    ctx.fillRect(0, 0, 300, 160);
    const sz = 32, gap = 4, ox = (300-4*(sz+gap))/2, oy = 8;
    for (let i = 0; i < 16; i++) {
      const r = Math.floor(i/4), c = i%4;
      const v = grid[i];
      ctx.fillStyle = tileColors[v] || '#e94560';
      ctx.fillRect(ox+c*(sz+gap), oy+r*(sz+gap), sz, sz);
      if (v > 0) {
        ctx.fillStyle = v >= 8 ? '#fff' : '#aaa';
        ctx.font = (v >= 1024 ? '8' : v >= 100 ? '10' : '12') + 'px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(v, ox+c*(sz+gap)+sz/2, oy+r*(sz+gap)+sz/2+4);
      }
    }
  }
  setInterval(draw, 60);
  draw();
})();

// Minesweeper preview
(() => {
  const cv = document.getElementById('previewMines');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  cv.width = 300; cv.height = 160;
  const sz = 16, cols = 9, rows = 9;
  const ox = (300-cols*sz)/2, oy = (160-rows*sz)/2;
  let grid = Array(cols*rows).fill(-1); // -1 = hidden
  let tick = 0;
  const numColors = ['','#4a90d9','#00ff88','#e94560','#9b59b6','#ff8c00','#00bcd4','#fff','#888'];

  function draw() {
    tick++;
    if (tick % 10 === 0) {
      const hidden = grid.map((v,i) => v===-1?i:-1).filter(i=>i>=0);
      if (hidden.length) {
        const idx = hidden[Math.floor(Math.random()*hidden.length)];
        grid[idx] = Math.random() < 0.15 ? 9 : Math.floor(Math.random()*4); // 9=mine
      }
    }
    if (tick % 80 === 0) grid = Array(cols*rows).fill(-1);

    ctx.fillStyle = '#0f1123';
    ctx.fillRect(0, 0, 300, 160);
    for (let i = 0; i < cols*rows; i++) {
      const c = i%cols, r = Math.floor(i/cols);
      const x = ox+c*sz, y = oy+r*sz;
      if (grid[i] === -1) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x+1, y+1, sz-2, sz-2);
      } else if (grid[i] === 9) {
        ctx.fillStyle = '#e94560';
        ctx.fillRect(x+1, y+1, sz-2, sz-2);
        ctx.fillStyle = '#0f1123';
        ctx.beginPath(); ctx.arc(x+sz/2, y+sz/2, 3, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle = '#0f1123';
        ctx.fillRect(x+1, y+1, sz-2, sz-2);
        if (grid[i] > 0) {
          ctx.fillStyle = numColors[grid[i]];
          ctx.font = '10px Segoe UI';
          ctx.textAlign = 'center';
          ctx.fillText(grid[i], x+sz/2, y+sz/2+4);
        }
      }
    }
  }
  setInterval(draw, 50);
  draw();
})();
