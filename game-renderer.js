(function (root) {
  'use strict';

  var CONFIG = root.FlappyEngine.CONFIG;

  function create(options) {
    options = options || {};
    var app;
    var worldLayer;
    var pipeLayer;
    var pipeMask;
    var birdView;
    var floorView;
    var birdTextures = [];
    var pipeCapTexture;
    var pipeBodyTexture;
    var views = new Map();
    var pool = [];
    var renderVersion = 0;

    function makePipeView() {
      var view = {
        container: new PIXI.Container(),
        upperBody: new PIXI.Sprite({ texture: pipeBodyTexture }),
        upperCap: new PIXI.Sprite({ texture: pipeCapTexture }),
        lowerCap: new PIXI.Sprite({ texture: pipeCapTexture }),
        lowerBody: new PIXI.Sprite({ texture: pipeBodyTexture })
      };
      view.upperBody.anchor.set(0.5, 0);
      view.upperCap.anchor.set(0.5, 0);
      view.lowerCap.anchor.set(0.5, 0);
      view.lowerBody.anchor.set(0.5, 0);
      view.upperCap.rotation = Math.PI;
      view.container.addChild(
        view.upperBody, view.upperCap, view.lowerCap, view.lowerBody
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

    function layoutPipe(pipe, view) {
      var capHeight = 23;
      var bodyWidth = 44;
      var overlap = 6;
      var lowerY = pipe.gapY + CONFIG.gapSize;

      view.upperBody.position.set(CONFIG.pipeWidth / 2, pipe.gapY - CONFIG.pipeHeight);
      view.upperBody.width = bodyWidth;
      view.upperBody.height = CONFIG.pipeHeight - capHeight + overlap;
      view.upperCap.position.set(CONFIG.pipeWidth / 2, pipe.gapY);
      view.upperCap.width = CONFIG.pipeWidth;
      view.upperCap.height = capHeight;

      view.lowerCap.position.set(CONFIG.pipeWidth / 2, lowerY);
      view.lowerCap.width = CONFIG.pipeWidth;
      view.lowerCap.height = capHeight;
      view.lowerBody.position.set(CONFIG.pipeWidth / 2, lowerY + capHeight - overlap);
      view.lowerBody.width = bodyWidth;
      view.lowerBody.height = CONFIG.pipeHeight - capHeight + overlap;
      view.gapY = pipe.gapY;
    }

    function syncPipes(world, alpha) {
      renderVersion++;
      for (var i = 0; i < world.pipes.length; i++) {
        var pipe = world.pipes[i];
        var view = views.get(pipe.id) || acquireView(pipe.id);
        view.renderVersion = renderVersion;
        if (view.gapY !== pipe.gapY) layoutPipe(pipe, view);
        view.container.x = pipe.previousX + (pipe.x - pipe.previousX) * alpha;
      }
      views.forEach(function (view, id) {
        if (view.renderVersion !== renderVersion) releaseView(id);
      });
    }

    function render(world, alpha) {
      if (!app || !birdView) return;
      syncPipes(world, alpha);
      var player = world.player;
      var y = player.previousY + (player.y - player.previousY) * alpha;
      var rotation = player.previousRotation +
        (player.rotation - player.previousRotation) * alpha;
      var visibleRotation = Math.min(20, rotation);

      birdView.texture = birdTextures[player.frameIndex];
      birdView.position.set(
        CONFIG.playerX + CONFIG.playerWidth / 2,
        y + CONFIG.playerHeight / 2
      );
      birdView.rotation = -visibleRotation * Math.PI / 180;
    }

    function resize() {
      if (!app || !app.renderer) return;
      var width = root.innerWidth;
      var height = root.innerHeight;
      var scale = Math.min(width / CONFIG.width, height / CONFIG.height);
      var offsetX = Math.floor((width - CONFIG.width * scale) / 2);
      var offsetY = Math.floor((height - CONFIG.height * scale) / 2);
      app.renderer.resize(width, height);
      worldLayer.scale.set(scale);
      worldLayer.position.set(offsetX, offsetY);
      document.documentElement.style.setProperty(
        '--hud-top',
        Math.floor(offsetY + CONFIG.height * 0.1 * scale) + 'px'
      );
      document.documentElement.style.setProperty(
        '--hud-size',
        Math.floor(36 * scale) + 'px'
      );
      document.documentElement.style.setProperty(
        '--start-top',
        Math.floor(offsetY + CONFIG.height * 0.12 * scale) + 'px'
      );
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
        worldLayer = new PIXI.Container();
        pipeLayer = new PIXI.Container();
        pipeMask = new PIXI.Graphics()
          .rect(0, 0, CONFIG.width, CONFIG.baseY)
          .fill(0xffffff);
        pipeLayer.mask = pipeMask;
        app.stage.eventMode = 'none';
        app.stage.interactiveChildren = false;

        floorView = new PIXI.Sprite({ texture: PIXI.Texture.WHITE });
        floorView.position.set(0, CONFIG.baseY);
        floorView.width = CONFIG.width;
        floorView.height = 2;
        floorView.tint = 0x56e2ff;
        floorView.alpha = 0.74;

        birdView = new PIXI.Sprite({ texture: birdTextures[0] });
        birdView.anchor.set(0.5);
        birdView.width = CONFIG.playerWidth;
        birdView.height = CONFIG.playerHeight;
        worldLayer.addChild(pipeLayer, pipeMask, floorView, birdView);
        app.stage.addChild(worldLayer);
        resize();
        root.addEventListener('resize', resize);
        app.ticker.add(options.onFrame, undefined, PIXI.UPDATE_PRIORITY.HIGH);
        return app.renderer.prepare && app.renderer.prepare.upload
          ? app.renderer.prepare.upload(app.stage)
          : undefined;
      }).then(function () {
        app.start();
        return { width: CONFIG.width, height: CONFIG.height };
      });
    }

    return {
      init: init,
      render: render,
      setDark: function () {}
    };
  }

  root.FlappyRenderer = { create: create };
})(window);
