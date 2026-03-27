(function() {
  'use strict';

  // === DOM References ===
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var menu = document.getElementById('menu');
  var hud = document.getElementById('hud');
  var scoreVal = document.getElementById('scoreVal');
  var highVal = document.getElementById('highVal');
  var menuHighScore = document.getElementById('menuHighScore');
  var pauseOverlay = document.getElementById('pauseOverlay');
  var deathOverlay = document.getElementById('deathOverlay');
  var finalScore = document.getElementById('finalScore');
  var newHighLabel = document.getElementById('newHighLabel');
  var countdownEl = document.getElementById('countdown');
  var infoOverlay = document.getElementById('infoOverlay');
  var controlsHint = document.getElementById('controls-hint');

  // === Canvas sizing ===
  function resizeCanvas() {
    canvas.width = Math.min(window.innerWidth, 480);
    canvas.height = Math.min(window.innerHeight, 720);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // === Game constants ===
  var GRAVITY = 0.45;
  var FLAP_FORCE = -7.5;
  var PIPE_WIDTH = 52;
  var PIPE_SPAWN_INTERVAL = 90; // frames
  var BIRD_SIZE = 20;

  // === Difficulty settings ===
  var DIFFICULTIES = {
    easy:   { gapSize: 170, baseSpeed: 2.2, speedInc: 0.08 },
    normal: { gapSize: 140, baseSpeed: 3.0, speedInc: 0.12 },
    hard:   { gapSize: 110, baseSpeed: 3.8, speedInc: 0.18 }
  };

  // === State ===
  var difficulty = 'normal';
  var soundOn = true;
  var highScore = parseInt(localStorage.getItem('flappyBirdHighScore')) || 0;
  var state = 'menu'; // menu, countdown, playing, paused, dead
  var score = 0;
  var bird, pipes, particles, pipeTimer, gameSpeed, frameCount;

  menuHighScore.textContent = highScore;

  // === Audio (Web Audio API) ===
  var audioCtx = null;

  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSound(type) {
    if (!soundOn || !audioCtx) return;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    var now = audioCtx.currentTime;

    if (type === 'flap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'score') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.setValueAtTime(680, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'die') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  }

  // === Bird ===
  function createBird() {
    return {
      x: canvas.width * 0.3,
      y: canvas.height / 2,
      vy: 0,
      rotation: 0,
      width: BIRD_SIZE * 1.4,
      height: BIRD_SIZE
    };
  }

  function flapBird() {
    bird.vy = FLAP_FORCE;
    playSound('flap');
    // Spawn flap particles
    for (var i = 0; i < 5; i++) {
      particles.push({
        x: bird.x - bird.width / 2,
        y: bird.y + (Math.random() - 0.5) * bird.height,
        vx: -Math.random() * 2 - 0.5,
        vy: (Math.random() - 0.5) * 2,
        life: 1,
        decay: 0.03 + Math.random() * 0.03,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? '#e94560' : '#ff6b81'
      });
    }
  }

  // === Pipes ===
  function spawnPipe() {
    var settings = DIFFICULTIES[difficulty];
    var gap = settings.gapSize;
    var minTop = 60;
    var maxTop = canvas.height - gap - 60;
    var topHeight = minTop + Math.random() * (maxTop - minTop);
    pipes.push({
      x: canvas.width,
      topHeight: topHeight,
      gap: gap,
      scored: false
    });
  }

  // === Particles ===
  function spawnTrailParticle() {
    particles.push({
      x: bird.x - bird.width / 2,
      y: bird.y,
      vx: -Math.random() * 1.5 - 0.3,
      vy: (Math.random() - 0.5) * 0.8,
      life: 1,
      decay: 0.04 + Math.random() * 0.02,
      size: 1.5 + Math.random() * 2,
      color: '#e94560'
    });
  }

  // === Collision ===
  function checkCollision() {
    // Ground and ceiling
    if (bird.y + bird.height / 2 >= canvas.height || bird.y - bird.height / 2 <= 0) {
      return true;
    }
    // Pipes
    var bx = bird.x;
    var by = bird.y;
    var bw = bird.width * 0.8; // slightly forgiving hitbox
    var bh = bird.height * 0.8;
    for (var i = 0; i < pipes.length; i++) {
      var p = pipes[i];
      var px = p.x;
      var pw = PIPE_WIDTH;
      // horizontal overlap
      if (bx + bw / 2 > px && bx - bw / 2 < px + pw) {
        // top pipe
        if (by - bh / 2 < p.topHeight) return true;
        // bottom pipe
        if (by + bh / 2 > p.topHeight + p.gap) return true;
      }
    }
    return false;
  }

  // === Init game ===
  function initGame() {
    bird = createBird();
    pipes = [];
    particles = [];
    pipeTimer = 0;
    score = 0;
    frameCount = 0;
    gameSpeed = DIFFICULTIES[difficulty].baseSpeed;
    scoreVal.textContent = '0';
    highVal.textContent = highScore;
    newHighLabel.style.display = 'none';
  }

  // === Update ===
  function update() {
    if (state !== 'playing') return;

    frameCount++;
    var settings = DIFFICULTIES[difficulty];

    // Gradually increase speed
    gameSpeed = settings.baseSpeed + Math.floor(score / 5) * settings.speedInc;

    // Bird physics
    bird.vy += GRAVITY;
    bird.y += bird.vy;

    // Bird rotation based on velocity
    var targetRot = Math.max(-0.5, Math.min(bird.vy / 10, 1.2));
    bird.rotation += (targetRot - bird.rotation) * 0.15;

    // Trail particle
    if (frameCount % 3 === 0) {
      spawnTrailParticle();
    }

    // Pipe spawning
    pipeTimer++;
    if (pipeTimer >= PIPE_SPAWN_INTERVAL) {
      spawnPipe();
      pipeTimer = 0;
    }

    // Move pipes
    for (var i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= gameSpeed;
      // Score check
      if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < bird.x) {
        pipes[i].scored = true;
        score++;
        scoreVal.textContent = score;
        playSound('score');
      }
      // Remove offscreen
      if (pipes[i].x + PIPE_WIDTH < -10) {
        pipes.splice(i, 1);
      }
    }

    // Update particles
    for (var j = particles.length - 1; j >= 0; j--) {
      var pt = particles[j];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life -= pt.decay;
      if (pt.life <= 0) {
        particles.splice(j, 1);
      }
    }

    // Collision
    if (checkCollision()) {
      die();
    }
  }

  // === Die ===
  function die() {
    state = 'dead';
    playSound('die');

    // Death burst particles
    for (var i = 0; i < 20; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 1 + Math.random() * 4;
      particles.push({
        x: bird.x,
        y: bird.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
        size: 2 + Math.random() * 4,
        color: Math.random() > 0.3 ? '#e94560' : '#ffd700'
      });
    }

    var isNew = false;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('flappyBirdHighScore', highScore);
      isNew = true;
    }

    finalScore.textContent = score;
    newHighLabel.style.display = isNew ? 'block' : 'none';
    menuHighScore.textContent = highScore;
    highVal.textContent = highScore;

    deathOverlay.style.display = 'flex';
  }

  // === Draw ===
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    var bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#0a0a1a');
    bgGrad.addColorStop(1, '#0f1123');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Background grid lines (subtle)
    ctx.strokeStyle = 'rgba(233, 69, 96, 0.03)';
    ctx.lineWidth = 1;
    for (var gx = 0; gx < canvas.width; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, canvas.height);
      ctx.stroke();
    }
    for (var gy = 0; gy < canvas.height; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(canvas.width, gy);
      ctx.stroke();
    }

    // Ground line
    ctx.strokeStyle = 'rgba(233, 69, 96, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 1);
    ctx.lineTo(canvas.width, canvas.height - 1);
    ctx.stroke();

    // Draw pipes
    for (var i = 0; i < pipes.length; i++) {
      var p = pipes[i];
      // Top pipe
      var topGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
      topGrad.addColorStop(0, '#1a3a2a');
      topGrad.addColorStop(0.5, '#2a5a3a');
      topGrad.addColorStop(1, '#1a3a2a');
      ctx.fillStyle = topGrad;
      ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
      // Top pipe cap
      ctx.fillStyle = '#3a7a4a';
      ctx.fillRect(p.x - 3, p.topHeight - 20, PIPE_WIDTH + 6, 20);
      // Top pipe border
      ctx.strokeStyle = 'rgba(74, 144, 217, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x, 0, PIPE_WIDTH, p.topHeight);

      // Bottom pipe
      var botY = p.topHeight + p.gap;
      var botGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
      botGrad.addColorStop(0, '#1a3a2a');
      botGrad.addColorStop(0.5, '#2a5a3a');
      botGrad.addColorStop(1, '#1a3a2a');
      ctx.fillStyle = botGrad;
      ctx.fillRect(p.x, botY, PIPE_WIDTH, canvas.height - botY);
      // Bottom pipe cap
      ctx.fillStyle = '#3a7a4a';
      ctx.fillRect(p.x - 3, botY, PIPE_WIDTH + 6, 20);
      // Bottom pipe border
      ctx.strokeStyle = 'rgba(74, 144, 217, 0.3)';
      ctx.strokeRect(p.x, botY, PIPE_WIDTH, canvas.height - botY);

      // Glow near gap
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(74, 144, 217, 0.15)';
      ctx.shadowBlur = 0;
    }

    // Draw particles
    for (var j = 0; j < particles.length; j++) {
      var pt = particles[j];
      ctx.globalAlpha = pt.life;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw bird
    if (bird) {
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(bird.rotation);

      // Bird body (ellipse)
      ctx.fillStyle = '#e94560';
      ctx.beginPath();
      ctx.ellipse(0, 0, bird.width / 2, bird.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bird glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(233, 69, 96, 0.6)';
      ctx.fillStyle = '#ff6b81';
      ctx.beginPath();
      ctx.ellipse(0, 0, bird.width / 2 - 3, bird.height / 2 - 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(bird.width / 4, -bird.height / 5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0a1a';
      ctx.beginPath();
      ctx.arc(bird.width / 4 + 1.5, -bird.height / 5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(bird.width / 2, -3);
      ctx.lineTo(bird.width / 2 + 8, 0);
      ctx.lineTo(bird.width / 2, 3);
      ctx.closePath();
      ctx.fill();

      // Wing
      ctx.fillStyle = '#c83050';
      ctx.beginPath();
      var wingFlap = Math.sin(frameCount * 0.3) * 4;
      ctx.ellipse(-3, wingFlap, 6, 10, -0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // === Game Loop ===
  function gameLoop() {
    update();
    draw();

    // Continue drawing particles during death
    if (state === 'dead') {
      for (var j = particles.length - 1; j >= 0; j--) {
        var pt = particles[j];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= pt.decay;
        if (pt.life <= 0) particles.splice(j, 1);
      }
    }

    requestAnimationFrame(gameLoop);
  }

  // === Countdown ===
  function startCountdown() {
    state = 'countdown';
    menu.style.display = 'none';
    deathOverlay.style.display = 'none';
    pauseOverlay.style.display = 'none';
    hud.style.display = 'flex';
    controlsHint.style.display = 'block';
    countdownEl.style.display = 'block';

    initGame();

    var count = 3;
    countdownEl.textContent = count;

    var interval = setInterval(function() {
      count--;
      if (count > 0) {
        countdownEl.textContent = count;
      } else {
        clearInterval(interval);
        countdownEl.style.display = 'none';
        state = 'playing';
      }
    }, 700);
  }

  // === Show menu ===
  function showMenu() {
    state = 'menu';
    menu.style.display = 'flex';
    hud.style.display = 'none';
    pauseOverlay.style.display = 'none';
    deathOverlay.style.display = 'none';
    countdownEl.style.display = 'none';
    controlsHint.style.display = 'none';
    menuHighScore.textContent = highScore;
    // Draw idle bird on menu
    bird = createBird();
    pipes = [];
    particles = [];
    frameCount = 0;
  }

  // === Event: Difficulty ===
  var diffBtns = document.querySelectorAll('.diff-btn');
  diffBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      diffBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      difficulty = btn.getAttribute('data-diff');
    });
  });

  // === Event: Sound toggle ===
  var soundToggle = document.getElementById('soundToggle');
  soundToggle.addEventListener('click', function() {
    soundOn = !soundOn;
    soundToggle.classList.toggle('on', soundOn);
  });

  // === Event: Start ===
  document.getElementById('startBtn').addEventListener('click', function() {
    ensureAudio();
    startCountdown();
  });

  // === Event: Info ===
  document.getElementById('infoBtn').addEventListener('click', function() {
    infoOverlay.style.display = 'flex';
  });
  document.getElementById('infoCloseBtn').addEventListener('click', function() {
    infoOverlay.style.display = 'none';
  });

  // === Event: Back to Hub ===
  document.getElementById('backToHubBtn').addEventListener('click', function() {
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
      window.location.href = chrome.runtime.getURL('index.html');
    } else {
      window.location.href = '../index.html';
    }
  });

  // === Event: Retry ===
  document.getElementById('retryBtn').addEventListener('click', function() {
    ensureAudio();
    startCountdown();
  });

  // === Event: Menu from death ===
  document.getElementById('menuBtn').addEventListener('click', function() {
    showMenu();
  });

  // === Event: Pause buttons ===
  document.getElementById('resumeBtn').addEventListener('click', function() {
    state = 'playing';
    pauseOverlay.style.display = 'none';
  });
  document.getElementById('quitBtn').addEventListener('click', function() {
    showMenu();
  });

  // === Input handling ===
  function handleFlap(e) {
    if (e) e.preventDefault();
    ensureAudio();

    if (state === 'playing') {
      flapBird();
    }
  }

  document.addEventListener('keydown', function(e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      handleFlap();
    }
    if (e.code === 'KeyP') {
      if (state === 'playing') {
        state = 'paused';
        pauseOverlay.style.display = 'flex';
      } else if (state === 'paused') {
        state = 'playing';
        pauseOverlay.style.display = 'none';
      }
    }
    if (e.code === 'Escape') {
      if (state === 'playing' || state === 'paused' || state === 'dead') {
        showMenu();
      }
    }
  });

  canvas.addEventListener('click', function(e) {
    handleFlap(e);
  });

  canvas.addEventListener('touchstart', function(e) {
    handleFlap(e);
  }, { passive: false });

  // === Init ===
  showMenu();
  gameLoop();

})();
