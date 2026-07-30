(function (root) {
  'use strict';
  var WING_CYCLE = [0, 1, 2, 1];

  function create(options) {
    options = options || {};
    var app;
    var gameLayer;
    var pipeLayer;
    var birdView;
    var groundView;
    var flashView;
    var birdTextures = [];
    var pipeCapTexture;
    var pipeBodyTexture;
    var views = new Map();
    var pool = [];
    var renderVersion = 0;
    var reducedMotion = !!(root.matchMedia &&
      root.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function makePipeView() {
      var view = {
        container: new PIXI.Container(),
        topBody: new PIXI.Sprite({ texture: pipeBodyTexture }),
        topCap: new PIXI.Sprite({ texture: pipeCapTexture }),
        bottomBody: new PIXI.Sprite({ texture: pipeBodyTexture }),
        bottomCap: new PIXI.Sprite({ texture: pipeCapTexture })
      };
      view.topBody.anchor.set(0.5, 0);
      view.topCap.anchor.set(0.5, 0);
      view.bottomBody.anchor.set(0.5, 0);
      view.bottomCap.anchor.set(0.5, 0);
      view.topCap.rotation = Math.PI;
      view.container.addChild(
        view.topBody, view.topCap, view.bottomBody, view.bottomCap
      );
      pipeLayer.addChild(view.container);
      return view;
    }

    function acquireView(id) {
      var view = pool.pop() || makePipeView();
      view.container.visible = true;
      views.set(id, view);
      return view;
    }

    function releaseView(id) {
      var view = views.get(id);
      if (!view) return;
      view.container.visible = false;
      views.delete(id);
      pool.push(view);
    }

    function layoutPipe(pipe, view, world) {
      var m = world.metrics;
      var top = pipe.cy - pipe.gap / 2;
      var bottom = pipe.cy + pipe.gap / 2;
      var bodyWidth = m.pipeWidth;
      var capWidth = m.pipeCapWidth;
      var capHeight = m.pipeCapHeight;
      var topBodyHeight = Math.max(1, top - capHeight * 0.56 + 10);
      var bottomBodyY = bottom + capHeight * 0.56;

      view.topBody.position.set(0, -10);
      view.topBody.width = bodyWidth;
      view.topBody.height = topBodyHeight;
      view.topCap.position.set(0, top);
      view.topCap.width = capWidth;
      view.topCap.height = capHeight;
      view.bottomCap.position.set(0, bottom);
      view.bottomCap.width = capWidth;
      view.bottomCap.height = capHeight;
      view.bottomBody.position.set(0, bottomBodyY);
      view.bottomBody.width = bodyWidth;
      view.bottomBody.height = Math.max(1, world.height - bottomBodyY + 10);
      view.layoutCenter = pipe.cy;
      view.layoutGap = pipe.gap;
      view.layoutHeight = world.height;
      view.layoutScale = m.scale;
    }

    function syncPipes(world, alpha) {
      renderVersion++;
      for (var i = 0; i < world.pipes.length; i++) {
        var pipe = world.pipes[i];
        var view = views.get(pipe.id) || acquireView(pipe.id);
        view.renderVersion = renderVersion;
        if (view.layoutCenter !== pipe.cy || view.layoutGap !== pipe.gap ||
            view.layoutHeight !== world.height ||
            view.layoutScale !== world.metrics.scale) {
          layoutPipe(pipe, view, world);
        }
        view.container.x = pipe.previousX + (pipe.x - pipe.previousX) * alpha;
      }
      views.forEach(function (view, id) {
        if (view.renderVersion !== renderVersion) releaseView(id);
      });
    }

    function birdFrame(world) {
      var bird = world.bird;
      if (world.state === 'dying' || world.state === 'dead') return 1;
      if (world.state === 'ready') {
        return WING_CYCLE[Math.floor(bird.animationTime * 8) % WING_CYCLE.length];
      }
      if (bird.flapAge < 0.32) {
        return WING_CYCLE[Math.floor(bird.flapAge * 16) % WING_CYCLE.length];
      }
      return bird.velocityY < 0 ? 0 : 1;
    }

    function render(world, alpha) {
      if (!app || !birdView) return;
      var bird = world.bird;
      var m = world.metrics;
      syncPipes(world, alpha);

      var shake = 0;
      if (!reducedMotion && world.state === 'dying' && world.deathTime < 0.16) {
        shake = (1 - world.deathTime / 0.16) * 6 * m.scale;
      }
      gameLayer.position.set(
        shake ? (Math.random() * 2 - 1) * shake : 0,
        shake ? (Math.random() * 2 - 1) * shake : 0
      );

      birdView.width = m.birdDrawWidth;
      birdView.height = m.birdDrawHeight;
      birdView.position.set(
        m.birdX,
        bird.previousY + (bird.y - bird.previousY) * alpha
      );
      birdView.rotation = bird.previousRotation +
        (bird.rotation - bird.previousRotation) * alpha;
      birdView.texture = birdTextures[birdFrame(world)];

      groundView.y = m.floorY;
      flashView.alpha = !reducedMotion && world.state === 'dying'
        ? Math.max(0, 0.28 * (1 - world.deathTime / 0.12))
        : 0;
    }

    function resize() {
      if (!app || !app.renderer) return;
      var width = root.innerWidth;
      var height = root.innerHeight;
      app.renderer.resize(width, height);
      groundView.width = width + 20;
      flashView.width = width;
      flashView.height = height;
      if (options.onResize) options.onResize(width, height);
    }

    function init() {
      if (!root.PIXI) return Promise.reject(new Error('PixiJS unavailable'));
      app = new PIXI.Application();
      return app.init({
        width: root.innerWidth,
        height: root.innerHeight,
        resolution: 1,
        autoDensity: false,
        antialias: false,
        backgroundAlpha: 0,
        preference: 'webgl',
        autoStart: false,
        sharedTicker: false,
        eventMode: 'none',
        eventFeatures: { move: false, globalMove: false, click: false, wheel: false },
        webgl: {
          preferWebGLVersion: 2,
          powerPreference: 'low-power',
          preserveDrawingBuffer: false
        }
      }).then(function () {
        document.getElementById('game').appendChild(app.canvas);
        return Promise.all([
          PIXI.Assets.load('/game-assets/bird-up.png'),
          PIXI.Assets.load('/game-assets/bird-mid.png'),
          PIXI.Assets.load('/game-assets/bird-down.png'),
          PIXI.Assets.load('/game-assets/pipe-cap.png'),
          PIXI.Assets.load('/game-assets/pipe-body.png')
        ]);
      }).then(function (textures) {
        birdTextures = textures.slice(0, 3);
        pipeCapTexture = textures[3];
        pipeBodyTexture = textures[4];
        gameLayer = new PIXI.Container();
        pipeLayer = new PIXI.Container();
        app.stage.eventMode = 'none';
        app.stage.interactiveChildren = false;
        groundView = new PIXI.Sprite({ texture: PIXI.Texture.WHITE });
        groundView.tint = 0x56e2ff;
        groundView.alpha = 0.74;
        groundView.height = 2;
        groundView.x = -10;
        birdView = new PIXI.Sprite({ texture: birdTextures[1] });
        birdView.anchor.set(0.5);
        flashView = new PIXI.Sprite({ texture: PIXI.Texture.WHITE });
        flashView.position.set(0, 0);
        gameLayer.addChild(pipeLayer, groundView, birdView);
        app.stage.addChild(gameLayer, flashView);
        resize();
        root.addEventListener('resize', resize);
        app.ticker.add(options.onFrame, undefined, PIXI.UPDATE_PRIORITY.HIGH);
        return app.renderer.prepare && app.renderer.prepare.upload
          ? app.renderer.prepare.upload(app.stage)
          : undefined;
      }).then(function () {
        app.start();
        return { width: root.innerWidth, height: root.innerHeight };
      });
    }

    function setDark(dark) {
      if (flashView) flashView.tint = dark ? 0xffffff : 0x000000;
    }

    return { init: init, render: render, setDark: setDark };
  }

  root.FlappyRenderer = { create: create };
})(window);
