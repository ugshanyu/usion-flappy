(function () {
  'use strict';

  var STRINGS = {
    en: {
      title: 'Flappy', tap: "Tap to flap. Don't hit the pipes.", score: 'Score',
      best: 'Best', friends: 'Friends', global: 'Global', loading: 'Loading…',
      again: 'Play again',
      empty: 'No friend records yet — invite friends and beat their scores!',
      emptyGlobal: 'No scores yet — be the first on the board!', you: 'You',
      newBest: 'New record!', rendererError: 'This device could not start the game.'
    },
    mn: {
      title: 'Flappy', tap: 'Товшиж нис. Хоолойд бүү мөргө.', score: 'Оноо',
      best: 'Дээд', friends: 'Найзууд', global: 'Дэлхий', loading: 'Уншиж байна…',
      again: 'Дахин тоглох',
      empty: 'Найзын амжилт алга — найзаа урьж, амжилтыг нь давaарай!',
      emptyGlobal: 'Оноо алга — тэргүүн нь болоорой!', you: 'Та',
      newBest: 'Шинэ дээд амжилт!',
      rendererError: 'Энэ төхөөрөмж тоглоомыг эхлүүлж чадсангүй.'
    }
  };
  var strings = STRINGS.en;
  var engine;
  var ready = false;
  var best = 0;
  var dark = false;
  var deadAt = 0;
  var accumulator = 0;
  var flapQueued = false;
  var FIXED_STEP = 1 / 120;
  var MAX_STEPS = 12;
  var reducedMotion = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hud = document.getElementById('hud');

  function applyStrings() {
    document.getElementById('t-title').textContent = strings.title;
    document.getElementById('t-tap').textContent =
      document.documentElement.dataset.gameAssets === 'error'
        ? strings.rendererError
        : strings.tap;
    document.getElementById('t-score').textContent = strings.score;
    document.getElementById('t-best').textContent = strings.best;
    document.getElementById('tab-friends').textContent = strings.friends;
    document.getElementById('tab-global').textContent = strings.global;
    document.getElementById('again').textContent = strings.again;
    document.getElementById('new-best').textContent = strings.newBest;
  }

  function applyTheme(theme) {
    dark = theme === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.body.classList.toggle('dark', dark);
    renderer.setDark(dark);
  }

  function updateBest(value) {
    best = Math.max(best, value);
    document.getElementById('best-score').textContent = String(best);
  }

  var leaderboard = FlappyLeaderboard.create({
    getStrings: function () { return strings; },
    updateBest: updateBest
  });

  function setHud(score) {
    hud.textContent = String(score);
    if (score > 0 && !reducedMotion && typeof hud.animate === 'function') {
      hud.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.16)' }, { transform: 'scale(1)' }],
        { duration: 120, easing: 'ease-out' }
      );
    }
  }

  function showGameOver() {
    deadAt = performance.now();
    hud.classList.add('hidden');
    var score = engine.world.score;
    var isNewBest = score > best && score > 0;
    if (isNewBest) best = score;
    document.getElementById('final-score').textContent = String(score);
    document.getElementById('best-score').textContent = String(best);
    document.getElementById('new-best').classList.toggle('show', isNewBest);
    document.getElementById('over').classList.remove('hidden');
    leaderboard.finish(score);
  }

  function handleEvents(events) {
    for (var i = 0; i < events.length; i++) {
      if (events[i].type === 'score') setHud(events[i].score);
      if (events[i].type === 'hit' && navigator.vibrate) {
        try { navigator.vibrate(35); } catch (error) {}
      }
      if (events[i].type === 'dead') showGameOver();
    }
  }

  function frame(ticker) {
    if (!engine || !ready) return;
    var elapsed = ticker.elapsedMS / 1000;
    var frameTime = elapsed > 0.25 ? FIXED_STEP : Math.min(elapsed, 0.1);
    accumulator += frameTime;
    var steps = 0;
    while (accumulator >= FIXED_STEP && steps < MAX_STEPS) {
      if (flapQueued) {
        flapQueued = false;
        handleEvents(engine.flap());
      }
      handleEvents(engine.step(FIXED_STEP));
      accumulator -= FIXED_STEP;
      steps++;
    }
    if (steps === MAX_STEPS && accumulator >= FIXED_STEP) accumulator = 0;
    renderer.render(engine.world, Math.min(1, accumulator / FIXED_STEP));
  }

  var renderer = FlappyRenderer.create({
    onFrame: frame,
    onResize: function (width, height) {
      if (engine) engine.resize(width, height);
      accumulator = 0;
    }
  });

  function beginPlay() {
    document.getElementById('start').classList.add('hidden');
    hud.classList.remove('hidden');
  }

  function requestFlap() {
    if (!ready) return;
    if (engine.world.state === FlappyEngine.STATES.DEAD) {
      if (performance.now() - deadAt > 700) restart();
      return;
    }
    if (engine.world.state === FlappyEngine.STATES.READY) beginPlay();
    if (engine.world.state !== FlappyEngine.STATES.DYING) flapQueued = true;
  }

  function restart() {
    document.getElementById('over').classList.add('hidden');
    document.getElementById('new-best').classList.remove('show');
    hud.classList.remove('hidden');
    leaderboard.reset();
    setHud(0);
    accumulator = 0;
    flapQueued = false;
    handleEvents(engine.restart());
  }

  document.addEventListener('pointerdown', function (event) {
    if (event.target.closest && event.target.closest('.panel')) return;
    event.preventDefault();
    requestFlap();
  }, { passive: false });
  document.addEventListener('keydown', function (event) {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      requestFlap();
    }
  });
  document.getElementById('again').addEventListener('click', restart);
  document.addEventListener('visibilitychange', function () {
    accumulator = 0;
    if (document.hidden) flapQueued = false;
  });

  document.documentElement.dataset.gameAssets = 'loading';
  renderer.init().then(function (size) {
    engine = FlappyEngine.create(size);
    renderer.setDark(dark);
    renderer.render(engine.world, 1);
    setHud(0);
    ready = true;
    document.documentElement.dataset.gameAssets = 'ready';
  }).catch(function () {
    document.documentElement.dataset.gameAssets = 'error';
    applyStrings();
  });

  function boot(config) {
    leaderboard.boot();
    var theme = (config && config.theme) ||
      (window.Usion && Usion.getTheme && Usion.getTheme()) || 'light';
    var language = (config && config.language) ||
      (window.Usion && Usion.getLanguage && Usion.getLanguage()) || 'en';
    strings = STRINGS[language] || STRINGS.en;
    applyTheme(theme);
    applyStrings();
    if (Usion.claimBackButton) {
      Usion.claimBackButton(function () {
        if (!engine) return false;
        var state = engine.world.state;
        if (state === FlappyEngine.STATES.PLAYING) {
          handleEvents(engine.crash());
          return true;
        }
        return state === FlappyEngine.STATES.DYING;
      });
    }
  }

  if (window.Usion && typeof Usion.init === 'function') {
    Usion.init(boot);
  } else {
    var prefersDark = window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
    applyStrings();
  }
})();
