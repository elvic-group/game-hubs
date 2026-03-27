(function() {
  'use strict';

  // --- Constants ---
  var DIFFICULTIES = {
    easy:   { rows: 9,  cols: 9,  mines: 10 },
    normal: { rows: 16, cols: 16, mines: 40 },
    hard:   { rows: 16, cols: 30, mines: 99 }
  };

  // --- State ---
  var difficulty = 'easy';
  var soundOn = true;
  var rows, cols, totalMines;
  var board;       // 2D: { mine, revealed, flagged, adjacent }
  var firstClick;
  var gameOver;
  var gameWon;
  var timerInterval;
  var timerSeconds;
  var flagCount;
  var revealedCount;
  var audioCtx;

  // --- DOM refs ---
  var menu          = document.getElementById('menu');
  var hud           = document.getElementById('hud');
  var gridWrap      = document.getElementById('gridWrap');
  var grid          = document.getElementById('grid');
  var faceBtn       = document.getElementById('faceBtn');
  var mineCountEl   = document.getElementById('mineCount');
  var timerEl       = document.getElementById('timerVal');
  var gameOverOv    = document.getElementById('gameOverOverlay');
  var winOv         = document.getElementById('winOverlay');
  var infoOv        = document.getElementById('infoOverlay');
  var controlsHint  = document.getElementById('controls-hint');
  var menuBestTime  = document.getElementById('menuBestTime');

  // --- Audio ---
  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playSound(type) {
    if (!soundOn) return;
    try {
      var ctx = getAudioCtx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      var now = ctx.currentTime;

      switch (type) {
        case 'reveal':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        case 'flag':
          osc.type = 'square';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(500, now + 0.08);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        case 'explode':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
          break;
        case 'win':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523, now);
          osc.frequency.setValueAtTime(659, now + 0.12);
          osc.frequency.setValueAtTime(784, now + 0.24);
          osc.frequency.setValueAtTime(1047, now + 0.36);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.start(now);
          osc.stop(now + 0.6);
          break;
      }
    } catch (e) { /* ignore audio errors */ }
  }

  // --- Best times ---
  function getBest() {
    try {
      return JSON.parse(localStorage.getItem('minesweeperBest')) || {};
    } catch (e) { return {}; }
  }
  function saveBest(diff, time) {
    var b = getBest();
    if (!b[diff] || time < b[diff]) {
      b[diff] = time;
      localStorage.setItem('minesweeperBest', JSON.stringify(b));
      return true;
    }
    return false;
  }
  function showMenuBest() {
    var b = getBest();
    menuBestTime.textContent = b[difficulty] ? b[difficulty] + 's' : '--';
  }

  // --- Difficulty buttons ---
  var diffBtns = document.querySelectorAll('.diff-btn');
  diffBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      diffBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      difficulty = btn.getAttribute('data-diff');
      showMenuBest();
    });
  });

  // --- Sound toggle ---
  var soundToggle = document.getElementById('soundToggle');
  soundToggle.addEventListener('click', function() {
    soundOn = !soundOn;
    soundToggle.classList.toggle('on', soundOn);
  });

  // --- Navigation ---
  document.getElementById('backToHubBtn').addEventListener('click', function() {
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
      window.location.href = chrome.runtime.getURL('index.html');
    } else {
      window.location.href = '../index.html';
    }
  });

  document.getElementById('infoBtn').addEventListener('click', function() {
    infoOv.style.display = 'flex';
  });
  document.getElementById('infoCloseBtn').addEventListener('click', function() {
    infoOv.style.display = 'none';
  });

  // --- Start game ---
  document.getElementById('startBtn').addEventListener('click', startGame);

  function startGame() {
    var cfg = DIFFICULTIES[difficulty];
    rows = cfg.rows;
    cols = cfg.cols;
    totalMines = cfg.mines;
    firstClick = true;
    gameOver = false;
    gameWon = false;
    flagCount = 0;
    revealedCount = 0;
    timerSeconds = 0;
    clearInterval(timerInterval);

    // Init board
    board = [];
    for (var r = 0; r < rows; r++) {
      board[r] = [];
      for (var c = 0; c < cols; c++) {
        board[r][c] = { mine: false, revealed: false, flagged: false, adjacent: 0 };
      }
    }

    // UI
    menu.style.display = 'none';
    gameOverOv.style.display = 'none';
    winOv.style.display = 'none';
    hud.style.display = 'block';
    gridWrap.style.display = 'flex';
    gridWrap.style.justifyContent = 'center';
    controlsHint.style.display = '';
    faceBtn.textContent = '\u{1F642}';

    updateMineCount();
    timerEl.textContent = '000';
    buildGrid();
    resizeCells();
  }

  // --- Build Grid ---
  function buildGrid() {
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = 'repeat(' + cols + ', auto)';
    grid.style.gridTemplateRows = 'repeat(' + rows + ', auto)';

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var cell = document.createElement('div');
        cell.className = 'cell hidden';
        cell.setAttribute('data-r', r);
        cell.setAttribute('data-c', c);
        grid.appendChild(cell);
      }
    }
  }

  // --- Responsive cell sizing ---
  function resizeCells() {
    var maxW = window.innerWidth - 24;
    var maxH = window.innerHeight - 80;
    var cellW = Math.floor(maxW / cols) - 1;
    var cellH = Math.floor(maxH / rows) - 1;
    var size = Math.min(cellW, cellH, 32);
    size = Math.max(size, 18);
    var cells = grid.querySelectorAll('.cell');
    cells.forEach(function(c) {
      c.style.width = size + 'px';
      c.style.height = size + 'px';
      c.style.fontSize = Math.max(size * 0.45, 10) + 'px';
    });
  }
  window.addEventListener('resize', function() {
    if (gridWrap.style.display !== 'none') resizeCells();
  });

  // --- Place mines after first click ---
  function placeMines(safeR, safeC) {
    var placed = 0;
    while (placed < totalMines) {
      var r = Math.floor(Math.random() * rows);
      var c = Math.floor(Math.random() * cols);
      // Keep safe zone around first click
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      if (board[r][c].mine) continue;
      board[r][c].mine = true;
      placed++;
    }
    // Compute adjacency
    for (var r2 = 0; r2 < rows; r2++) {
      for (var c2 = 0; c2 < cols; c2++) {
        if (board[r2][c2].mine) continue;
        var count = 0;
        forNeighbors(r2, c2, function(nr, nc) {
          if (board[nr][nc].mine) count++;
        });
        board[r2][c2].adjacent = count;
      }
    }
  }

  function forNeighbors(r, c, fn) {
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          fn(nr, nc);
        }
      }
    }
  }

  // --- Cell element lookup ---
  function getCell(r, c) {
    return grid.querySelector('[data-r="' + r + '"][data-c="' + c + '"]');
  }

  // --- Reveal cell ---
  function revealCell(r, c) {
    var cell = board[r][c];
    if (cell.revealed || cell.flagged || gameOver || gameWon) return;

    cell.revealed = true;
    revealedCount++;
    var el = getCell(r, c);
    el.className = 'cell revealed';

    if (cell.mine) {
      // Hit a mine
      el.classList.add('mine-hit');
      el.textContent = '\u{1F4A3}';
      gameOver = true;
      endGame(false);
      return;
    }

    if (cell.adjacent > 0) {
      var span = document.createElement('span');
      span.className = 'num' + cell.adjacent;
      span.textContent = cell.adjacent;
      el.appendChild(span);
    } else {
      // Flood fill
      forNeighbors(r, c, function(nr, nc) {
        revealCell(nr, nc);
      });
    }

    // Check win
    if (revealedCount === rows * cols - totalMines) {
      gameWon = true;
      endGame(true);
    }
  }

  // --- Flag cell ---
  function toggleFlag(r, c) {
    var cell = board[r][c];
    if (cell.revealed || gameOver || gameWon) return;
    var el = getCell(r, c);

    if (cell.flagged) {
      cell.flagged = false;
      flagCount--;
      el.textContent = '';
      el.className = 'cell hidden';
    } else {
      cell.flagged = true;
      flagCount++;
      el.textContent = '\u{1F6A9}';
      el.className = 'cell flagged';
    }
    playSound('flag');
    updateMineCount();
  }

  // --- Mine counter ---
  function updateMineCount() {
    var val = totalMines - flagCount;
    mineCountEl.textContent = val < 0 ? val : (val < 10 ? '0' + val : val);
  }

  // --- Timer ---
  function startTimer() {
    clearInterval(timerInterval);
    timerSeconds = 0;
    timerInterval = setInterval(function() {
      timerSeconds++;
      var s = String(timerSeconds);
      while (s.length < 3) s = '0' + s;
      timerEl.textContent = s;
    }, 1000);
  }

  // --- End game ---
  function endGame(won) {
    clearInterval(timerInterval);
    if (won) {
      faceBtn.textContent = '\u{1F60E}';
      playSound('win');
      // Auto-flag remaining mines
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (board[r][c].mine && !board[r][c].flagged) {
            var el = getCell(r, c);
            el.textContent = '\u{1F6A9}';
            el.className = 'cell flagged';
          }
        }
      }
      document.getElementById('winTime').textContent = timerSeconds;
      var isNew = saveBest(difficulty, timerSeconds);
      document.getElementById('bestTimeLabel').style.display = isNew ? '' : 'none';
      winOv.style.display = 'flex';
    } else {
      faceBtn.textContent = '\u{1F635}';
      playSound('explode');
      // Reveal all mines
      for (var r2 = 0; r2 < rows; r2++) {
        for (var c2 = 0; c2 < cols; c2++) {
          if (board[r2][c2].mine && !board[r2][c2].revealed) {
            var el2 = getCell(r2, c2);
            if (!board[r2][c2].flagged) {
              el2.className = 'cell mine-show';
              el2.textContent = '\u{1F4A3}';
            }
          }
          // Show wrong flags
          if (board[r2][c2].flagged && !board[r2][c2].mine) {
            var el3 = getCell(r2, c2);
            el3.textContent = '\u274C';
            el3.className = 'cell revealed';
          }
        }
      }
      document.getElementById('goTime').textContent = timerSeconds;
      gameOverOv.style.display = 'flex';
    }
  }

  // --- Grid events ---
  // Left click
  grid.addEventListener('click', function(e) {
    var cell = e.target.closest('.cell');
    if (!cell) return;
    var r = parseInt(cell.getAttribute('data-r'));
    var c = parseInt(cell.getAttribute('data-c'));
    if (board[r][c].flagged) return;

    if (firstClick) {
      firstClick = false;
      placeMines(r, c);
      startTimer();
    }
    playSound('reveal');
    revealCell(r, c);
  });

  // Right click = flag
  grid.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    var cell = e.target.closest('.cell');
    if (!cell) return;
    var r = parseInt(cell.getAttribute('data-r'));
    var c = parseInt(cell.getAttribute('data-c'));
    if (firstClick) return; // can't flag before first reveal
    toggleFlag(r, c);
  });

  // Long press for mobile
  var longPressTimer = null;
  var longPressTriggered = false;

  grid.addEventListener('touchstart', function(e) {
    var cell = e.target.closest('.cell');
    if (!cell) return;
    longPressTriggered = false;
    longPressTimer = setTimeout(function() {
      longPressTriggered = true;
      var r = parseInt(cell.getAttribute('data-r'));
      var c = parseInt(cell.getAttribute('data-c'));
      if (!firstClick) {
        toggleFlag(r, c);
      }
    }, 500);
  }, { passive: true });

  grid.addEventListener('touchend', function(e) {
    clearTimeout(longPressTimer);
    if (longPressTriggered) {
      e.preventDefault();
    }
  });

  grid.addEventListener('touchmove', function() {
    clearTimeout(longPressTimer);
  }, { passive: true });

  // --- Face button ---
  faceBtn.addEventListener('click', function() {
    startGame();
  });

  // --- Overlay buttons ---
  document.getElementById('retryBtn').addEventListener('click', startGame);
  document.getElementById('menuBtn').addEventListener('click', goMenu);
  document.getElementById('winRetryBtn').addEventListener('click', startGame);
  document.getElementById('winMenuBtn').addEventListener('click', goMenu);

  function goMenu() {
    clearInterval(timerInterval);
    gameOver = true;
    hud.style.display = 'none';
    gridWrap.style.display = 'none';
    gameOverOv.style.display = 'none';
    winOv.style.display = 'none';
    controlsHint.style.display = 'none';
    menu.style.display = 'flex';
    showMenuBest();
  }

  // --- Esc to menu ---
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (infoOv.style.display === 'flex') {
        infoOv.style.display = 'none';
      } else if (menu.style.display !== 'flex') {
        goMenu();
      }
    }
  });

  // --- Init ---
  showMenuBest();

})();
