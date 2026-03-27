// ========== 2048 Game — Elvic Groups ==========
(function() {
  'use strict';

  // --- Constants ---
  var SIZE = 4;
  var GAP = 8;
  var TILE_SIZE = 80;
  var CELL_STEP = TILE_SIZE + GAP;

  // --- Tile color palette (themed: reds, blues, golds) ---
  var TILE_STYLES = {
    2:    { bg: '#1a1a2e', color: '#e94560', border: 'rgba(233,69,96,0.3)' },
    4:    { bg: '#1e1e35', color: '#e94560', border: 'rgba(233,69,96,0.4)' },
    8:    { bg: '#2a1525', color: '#ff6b81', border: 'rgba(255,107,129,0.4)' },
    16:   { bg: '#351a20', color: '#ff4757', border: 'rgba(255,71,87,0.5)' },
    32:   { bg: '#3d1520', color: '#ff3344', border: 'rgba(255,51,68,0.6)' },
    64:   { bg: '#4a1018', color: '#ff1a1a', border: 'rgba(255,26,26,0.6)' },
    128:  { bg: '#1a2540', color: '#4a90d9', border: 'rgba(74,144,217,0.5)' },
    256:  { bg: '#152050', color: '#5ba0ef', border: 'rgba(91,160,239,0.5)' },
    512:  { bg: '#0f1a5a', color: '#6bb0ff', border: 'rgba(107,176,255,0.6)' },
    1024: { bg: '#2a2000', color: '#ffd700', border: 'rgba(255,215,0,0.5)' },
    2048: { bg: '#3a2a00', color: '#ffd700', border: 'rgba(255,215,0,0.7)' },
  };
  var SUPER_STYLE = { bg: '#3a0a20', color: '#ff69b4', border: 'rgba(255,105,180,0.6)' };

  function getTileStyle(val) {
    return TILE_STYLES[val] || SUPER_STYLE;
  }

  // --- DOM refs ---
  var menu = document.getElementById('menu');
  var hud = document.getElementById('hud');
  var gameArea = document.getElementById('gameArea');
  var tileLayer = document.getElementById('tileLayer');
  var scoreVal = document.getElementById('scoreVal');
  var bestVal = document.getElementById('bestVal');
  var menuBestScore = document.getElementById('menuBestScore');
  var gameOverOverlay = document.getElementById('gameOverOverlay');
  var winOverlay = document.getElementById('winOverlay');
  var finalScoreEl = document.getElementById('finalScore');
  var winScoreEl = document.getElementById('winScore');
  var newHighLabel = document.getElementById('newHighLabel');
  var winHighLabel = document.getElementById('winHighLabel');
  var undoBtn = document.getElementById('undoBtn');
  var controlsHint = document.getElementById('controls-hint');
  var infoOverlay = document.getElementById('infoOverlay');
  var soundToggle = document.getElementById('soundToggle');

  // --- State ---
  var grid = [];        // grid[r][c] = value or 0
  var tileEls = [];     // tileEls[r][c] = DOM element or null
  var score = 0;
  var bestScore = parseInt(localStorage.getItem('2048BestScore')) || 0;
  var won = false;
  var wonShown = false;
  var gameOver = false;
  var moving = false;
  var soundOn = true;
  var prevState = null; // for undo

  // --- Audio (Web Audio API) ---
  var audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playTone(freq, dur, type, vol) {
    if (!soundOn) return;
    try {
      var ctx = getAudioCtx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.value = vol || 0.12;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur);
    } catch(e) {}
  }

  function sndSlide()  { playTone(220, 0.1, 'triangle', 0.08); }
  function sndMerge()  { playTone(440, 0.15, 'sine', 0.12); playTone(660, 0.12, 'sine', 0.08); }
  function sndSpawn()  { playTone(330, 0.08, 'sine', 0.06); }
  function sndWin()    {
    playTone(523, 0.15, 'sine', 0.15);
    setTimeout(function(){ playTone(659, 0.15, 'sine', 0.15); }, 150);
    setTimeout(function(){ playTone(784, 0.25, 'sine', 0.15); }, 300);
  }
  function sndLose()   {
    playTone(330, 0.2, 'sawtooth', 0.1);
    setTimeout(function(){ playTone(220, 0.4, 'sawtooth', 0.08); }, 200);
  }

  // --- Init display ---
  menuBestScore.textContent = bestScore;
  bestVal.textContent = bestScore;

  // --- Helpers ---
  function emptyGrid() {
    var g = [];
    for (var r = 0; r < SIZE; r++) {
      g[r] = [];
      for (var c = 0; c < SIZE; c++) g[r][c] = 0;
    }
    return g;
  }

  function cloneGrid(g) {
    return g.map(function(row) { return row.slice(); });
  }

  function emptyCells(g) {
    var cells = [];
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (g[r][c] === 0) cells.push({ r: r, c: c });
    return cells;
  }

  function canMove(g) {
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++) {
        if (g[r][c] === 0) return true;
        if (c < SIZE - 1 && g[r][c] === g[r][c + 1]) return true;
        if (r < SIZE - 1 && g[r][c] === g[r + 1][c]) return true;
      }
    return false;
  }

  // --- Tile DOM ---
  function tilePos(r, c) {
    return { top: r * CELL_STEP, left: c * CELL_STEP };
  }

  function createTileEl(r, c, val, anim) {
    var el = document.createElement('div');
    el.className = 'tile' + (anim ? ' ' + anim : '');
    var style = getTileStyle(val);
    el.style.background = style.bg;
    el.style.color = style.color;
    el.style.border = '2px solid ' + style.border;
    var pos = tilePos(r, c);
    el.style.top = pos.top + 'px';
    el.style.left = pos.left + 'px';
    el.style.fontSize = val >= 1024 ? '20px' : val >= 128 ? '24px' : '28px';
    el.textContent = val;
    tileLayer.appendChild(el);
    return el;
  }

  function clearTiles() {
    tileLayer.innerHTML = '';
    tileEls = [];
    for (var r = 0; r < SIZE; r++) {
      tileEls[r] = [];
      for (var c = 0; c < SIZE; c++) tileEls[r][c] = null;
    }
  }

  function renderAllTiles() {
    clearTiles();
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (grid[r][c] !== 0)
          tileEls[r][c] = createTileEl(r, c, grid[r][c], null);
  }

  function spawnTile() {
    var cells = emptyCells(grid);
    if (cells.length === 0) return;
    var cell = cells[Math.floor(Math.random() * cells.length)];
    var val = Math.random() < 0.9 ? 2 : 4;
    grid[cell.r][cell.c] = val;
    tileEls[cell.r][cell.c] = createTileEl(cell.r, cell.c, val, 'new');
    sndSpawn();
  }

  // --- Slide logic ---
  // direction: 0=up, 1=right, 2=down, 3=left
  function slide(dir) {
    if (moving || gameOver) return false;

    // Save state for undo
    prevState = { grid: cloneGrid(grid), score: score };

    var moved = false;
    var mergedScore = 0;
    var mergedCells = []; // [{r,c}]

    // Determine traversal order
    var rowOrder = dir === 2 ? [3,2,1,0] : [0,1,2,3];
    var colOrder = dir === 1 ? [3,2,1,0] : [0,1,2,3];

    var newGrid = emptyGrid();
    var origins = []; // track where each tile came from for animation
    for (var r = 0; r < SIZE; r++) {
      origins[r] = [];
      for (var c = 0; c < SIZE; c++) origins[r][c] = null;
    }
    var mergeMap = emptyGrid(); // 1 if cell was result of merge

    if (dir === 0 || dir === 2) {
      // Vertical
      for (var ci = 0; ci < SIZE; ci++) {
        var c = colOrder[ci];
        var merged = [];
        var writePos = dir === 0 ? 0 : SIZE - 1;
        for (var ri = 0; ri < SIZE; ri++) {
          var r = rowOrder[ri];
          if (grid[r][c] === 0) continue;
          var val = grid[r][c];
          // Try merge
          var prevR = dir === 0 ? writePos - 1 : writePos + 1;
          if (prevR >= 0 && prevR < SIZE && newGrid[prevR][c] === val && !mergeMap[prevR][c]) {
            newGrid[prevR][c] = val * 2;
            mergeMap[prevR][c] = 1;
            mergedScore += val * 2;
            mergedCells.push({ r: prevR, c: c });
            origins[prevR][c] = { r: r, c: c, merge: true, fromR: r, fromC: c };
            if (r !== prevR) moved = true;
          } else {
            newGrid[writePos][c] = val;
            origins[writePos][c] = { r: r, c: c };
            if (writePos !== r) moved = true;
            writePos += dir === 0 ? 1 : -1;
          }
        }
      }
    } else {
      // Horizontal
      for (var ri = 0; ri < SIZE; ri++) {
        var r = rowOrder[ri];
        var writePos = dir === 3 ? 0 : SIZE - 1;
        for (var ci = 0; ci < SIZE; ci++) {
          var c = colOrder[ci];
          if (grid[r][c] === 0) continue;
          var val = grid[r][c];
          var prevC = dir === 3 ? writePos - 1 : writePos + 1;
          if (prevC >= 0 && prevC < SIZE && newGrid[r][prevC] === val && !mergeMap[r][prevC]) {
            newGrid[r][prevC] = val * 2;
            mergeMap[r][prevC] = 1;
            mergedScore += val * 2;
            mergedCells.push({ r: r, c: prevC });
            origins[r][prevC] = { r: r, c: c, merge: true, fromR: r, fromC: c };
            if (c !== prevC) moved = true;
          } else {
            newGrid[r][writePos] = val;
            origins[r][writePos] = { r: r, c: c };
            if (writePos !== c) moved = true;
            writePos += dir === 3 ? 1 : -1;
          }
        }
      }
    }

    if (!moved) {
      prevState = null;
      return false;
    }

    moving = true;
    sndSlide();

    // Animate existing tiles to new positions
    // First, move old tile elements to new positions
    var newTileEls = [];
    for (var r = 0; r < SIZE; r++) {
      newTileEls[r] = [];
      for (var c = 0; c < SIZE; c++) newTileEls[r][c] = null;
    }

    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (origins[r][c]) {
          var orig = origins[r][c];
          var el = tileEls[orig.r][orig.c];
          if (el) {
            var pos = tilePos(r, c);
            el.style.top = pos.top + 'px';
            el.style.left = pos.left + 'px';
            if (!newTileEls[r][c]) newTileEls[r][c] = el;
            tileEls[orig.r][orig.c] = null;
          }
        }
      }
    }

    grid = newGrid;
    score += mergedScore;
    updateScore();

    // After animation, update merged tiles and spawn
    setTimeout(function() {
      // Remove old elements, rebuild merged
      clearTiles();
      for (var r = 0; r < SIZE; r++)
        for (var c = 0; c < SIZE; c++)
          if (grid[r][c] !== 0) {
            var isMerged = mergeMap[r][c] === 1;
            tileEls[r][c] = createTileEl(r, c, grid[r][c], isMerged ? 'merged' : null);
          }

      if (mergedCells.length > 0) sndMerge();

      // Check win
      if (!wonShown) {
        for (var r = 0; r < SIZE; r++)
          for (var c = 0; c < SIZE; c++)
            if (grid[r][c] === 2048) { won = true; }
        if (won) {
          wonShown = true;
          showWin();
          moving = false;
          undoBtn.disabled = prevState === null;
          return;
        }
      }

      // Spawn new tile
      spawnTile();

      // Check game over
      if (!canMove(grid)) {
        gameOver = true;
        sndLose();
        showGameOver();
      }

      moving = false;
      undoBtn.disabled = false;
    }, 160);

    return true;
  }

  // --- Score ---
  function updateScore() {
    scoreVal.textContent = score;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('2048BestScore', bestScore);
    }
    bestVal.textContent = bestScore;
    menuBestScore.textContent = bestScore;
  }

  // --- Undo ---
  function undo() {
    if (!prevState || gameOver) return;
    grid = prevState.grid;
    score = prevState.score;
    prevState = null;
    updateScore();
    renderAllTiles();
    undoBtn.disabled = true;
  }

  // --- Screens ---
  function showMenu() {
    menu.style.display = 'flex';
    hud.style.display = 'none';
    gameArea.style.display = 'none';
    controlsHint.style.display = '';
    gameOverOverlay.style.display = 'none';
    winOverlay.style.display = 'none';
    menuBestScore.textContent = bestScore;
  }

  function startGame() {
    menu.style.display = 'none';
    hud.style.display = 'flex';
    gameArea.style.display = 'block';
    controlsHint.style.display = '';
    gameOverOverlay.style.display = 'none';
    winOverlay.style.display = 'none';

    grid = emptyGrid();
    score = 0;
    won = false;
    wonShown = false;
    gameOver = false;
    moving = false;
    prevState = null;
    undoBtn.disabled = true;
    updateScore();
    clearTiles();
    spawnTile();
    spawnTile();
  }

  function showGameOver() {
    finalScoreEl.textContent = score;
    newHighLabel.style.display = score >= bestScore && score > 0 ? '' : 'none';
    gameOverOverlay.style.display = 'flex';
  }

  function showWin() {
    sndWin();
    winScoreEl.textContent = score;
    winHighLabel.style.display = score >= bestScore && score > 0 ? '' : 'none';
    winOverlay.style.display = 'flex';
  }

  // --- Input: keyboard ---
  document.addEventListener('keydown', function(e) {
    if (infoOverlay.style.display === 'flex') return;

    // Menu active - Enter starts game
    if (menu.style.display !== 'none') {
      if (e.key === 'Enter') { startGame(); e.preventDefault(); }
      return;
    }

    if (e.key === 'Escape') { showMenu(); e.preventDefault(); return; }

    if (gameOverOverlay.style.display === 'flex' || winOverlay.style.display === 'flex') return;

    var dir = -1;
    switch(e.key) {
      case 'ArrowUp':    case 'w': case 'W': dir = 0; break;
      case 'ArrowRight': case 'd': case 'D': dir = 1; break;
      case 'ArrowDown':  case 's': case 'S': dir = 2; break;
      case 'ArrowLeft':  case 'a': case 'A': dir = 3; break;
      case 'z': case 'Z': undo(); e.preventDefault(); return;
    }
    if (dir >= 0) { e.preventDefault(); slide(dir); }
  });

  // --- Input: swipe (mobile) ---
  var touchStartX = 0, touchStartY = 0;
  document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (menu.style.display !== 'none') return;
    if (gameOverOverlay.style.display === 'flex' || winOverlay.style.display === 'flex') return;

    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    var absDx = Math.abs(dx), absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 30) return;

    var dir;
    if (absDx > absDy) {
      dir = dx > 0 ? 1 : 3;
    } else {
      dir = dy > 0 ? 2 : 0;
    }
    slide(dir);
  }, { passive: true });

  // --- Button events ---
  document.getElementById('startBtn').addEventListener('click', startGame);

  document.getElementById('retryBtn').addEventListener('click', startGame);

  document.getElementById('menuBtn').addEventListener('click', showMenu);

  document.getElementById('continueBtn').addEventListener('click', function() {
    winOverlay.style.display = 'none';
    spawnTile();
    if (!canMove(grid)) {
      gameOver = true;
      sndLose();
      showGameOver();
    }
  });

  document.getElementById('winMenuBtn').addEventListener('click', showMenu);

  undoBtn.addEventListener('click', function() {
    undo();
  });

  // Sound toggle
  soundToggle.addEventListener('click', function() {
    soundOn = !soundOn;
    soundToggle.classList.toggle('on', soundOn);
  });

  // Info
  document.getElementById('infoBtn').addEventListener('click', function() {
    infoOverlay.style.display = 'flex';
  });
  document.getElementById('infoCloseBtn').addEventListener('click', function() {
    infoOverlay.style.display = 'none';
  });

  // Back to Hub
  document.getElementById('backToHubBtn').addEventListener('click', function() {
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
      window.location.href = chrome.runtime.getURL('index.html');
    } else {
      window.location.href = '../index.html';
    }
  });

  // --- Initial state ---
  showMenu();

})();
