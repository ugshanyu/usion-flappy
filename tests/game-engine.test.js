'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var FlappyEngine = require('../game-engine.js');
var STEP = 1 / 120;

function advance(engine, seconds) {
  var events = [];
  var count = Math.round(seconds / STEP);
  for (var i = 0; i < count; i++) {
    events = events.concat(engine.step(STEP));
  }
  return events;
}

test('flap produces the classic short rise followed by a fall', function () {
  var engine = FlappyEngine.create({ width: 390, height: 844, random: function () { return 0.5; } });
  var startY = engine.world.bird.y;
  engine.flap();
  advance(engine, 0.25);

  assert.equal(engine.world.state, FlappyEngine.STATES.PLAYING);
  assert.ok(engine.world.bird.y < startY - 50);
  assert.ok(engine.world.bird.velocityY < 0);
  assert.ok(engine.world.bird.rotation < -0.25);

  advance(engine, 0.5);
  assert.ok(engine.world.bird.velocityY > 0);
  assert.ok(engine.world.bird.rotation > 0);
});

test('pipe speed remains constant regardless of score', function () {
  var engine = FlappyEngine.create({ width: 390, height: 5000, random: function () { return 0.5; } });
  engine.flap();
  advance(engine, 0.42);
  assert.equal(engine.world.pipes.length, 1);

  var pipe = engine.world.pipes[0];
  var startX = pipe.x;
  engine.world.score = 100;
  advance(engine, 0.25);
  var moved = startX - pipe.x;

  assert.ok(Math.abs(moved - engine.world.metrics.pipeSpeed * 0.25) < 0.01);
});

test('flapping changes only the bird and leaves every pipe untouched', function () {
  var engine = FlappyEngine.create({ width: 390, height: 5000, random: function () { return 0.5; } });
  engine.flap();
  advance(engine, 0.42);
  var before = engine.world.pipes.map(function (pipe) {
    return { id: pipe.id, x: pipe.x, previousX: pipe.previousX, cy: pipe.cy, gap: pipe.gap };
  });
  var spawnDistance = engine.world.spawnDistance;

  engine.flap();

  assert.deepEqual(engine.world.pipes.map(function (pipe) {
    return { id: pipe.id, x: pipe.x, previousX: pipe.previousX, cy: pipe.cy, gap: pipe.gap };
  }), before);
  assert.equal(engine.world.spawnDistance, spawnDistance);
});

test('motion ratios scale from width rather than refresh rate or screen height', function () {
  var phone = FlappyEngine.create({ width: 390, height: 844 });
  var tablet = FlappyEngine.create({ width: 780, height: 1688 });

  assert.equal(tablet.world.metrics.gravity, phone.world.metrics.gravity * 1.6);
  assert.equal(tablet.world.metrics.flapVelocity, phone.world.metrics.flapVelocity * 1.6);
  assert.equal(tablet.world.metrics.pipeSpeed, phone.world.metrics.pipeSpeed * 1.6);
  assert.equal(tablet.world.metrics.birdDrawWidth, phone.world.metrics.birdDrawWidth * 1.6);
});

test('base-width obstacle geometry uses the reference difficulty targets', function () {
  var engine = FlappyEngine.create({ width: 390, height: 844 });
  var metrics = engine.world.metrics;

  assert.equal(metrics.pipeGap, 135);
  assert.equal(metrics.pipeSpeed, 173);
  assert.equal(metrics.pipeSpacing, 195);
  assert.equal(metrics.pipeWidth, 72);
  assert.equal(metrics.pipeCapWidth, 85);
  assert.equal(metrics.pipeCapHeight, 38);
  assert.equal(metrics.maxPipeShift, 190);
  assert.equal(metrics.birdHitWidth, 40);
  assert.equal(metrics.birdHitHeight, 28);
  assert.equal(metrics.pipeGap - metrics.birdHitHeight, 107);
});

test('the first pipe uses the full random range instead of being centered', function () {
  var engine = FlappyEngine.create({
    width: 390,
    height: 5000,
    random: function () { return 0; }
  });
  engine.flap();
  advance(engine, 0.3);

  assert.equal(engine.world.pipes.length, 1);
  assert.equal(
    engine.world.pipes[0].cy,
    engine.world.metrics.pipeMargin + engine.world.metrics.pipeGap / 2
  );
});

test('adjacent pipe shifts are challenging but remain bounded', function () {
  var values = [0, 1];
  var engine = FlappyEngine.create({
    width: 390,
    height: 5000,
    random: function () { return values.shift(); }
  });
  engine.flap();
  advance(engine, 1.45);

  assert.equal(engine.world.pipes.length, 2);
  assert.equal(
    engine.world.pipes[1].cy - engine.world.pipes[0].cy,
    engine.world.metrics.maxPipeShift
  );
});

test('the rendered pipe cap width participates in collisions', function () {
  var engine = FlappyEngine.create({
    width: 390,
    height: 5000,
    random: function () { return 0.5; }
  });
  engine.flap();
  advance(engine, 0.3);

  var metrics = engine.world.metrics;
  var pipe = engine.world.pipes[0];
  var top = pipe.cy - pipe.gap / 2;
  pipe.x = metrics.birdX + 59 + metrics.pipeSpeed * STEP;
  pipe.previousX = pipe.x;
  engine.world.bird.y = top - metrics.birdHitHeight / 2 + 1;
  engine.world.bird.previousY = engine.world.bird.y;
  engine.world.bird.velocityY = 0;

  var events = engine.step(STEP);

  assert.ok(events.some(function (event) { return event.type === 'hit'; }));
});

test('a collision transitions through a visible falling death sequence', function () {
  var engine = FlappyEngine.create({ width: 390, height: 844 });
  engine.flap();
  engine.world.bird.y = 200;
  engine.world.bird.previousY = 200;
  var hit = engine.crash();
  var afterHit = engine.world.bird.y;

  assert.equal(hit[0].type, 'hit');
  assert.equal(engine.world.state, FlappyEngine.STATES.DYING);
  advance(engine, 0.25);
  assert.ok(engine.world.bird.y > afterHit);
  assert.equal(engine.world.state, FlappyEngine.STATES.DYING);

  var events = advance(engine, 1);
  assert.equal(engine.world.state, FlappyEngine.STATES.DEAD);
  assert.ok(events.some(function (event) { return event.type === 'dead'; }));
});

test('the ceiling clamps the bird without a sudden game over', function () {
  var engine = FlappyEngine.create({ width: 390, height: 844 });
  engine.flap();
  engine.world.bird.y = 2;
  engine.world.bird.velocityY = -400;
  advance(engine, STEP);

  assert.equal(engine.world.state, FlappyEngine.STATES.PLAYING);
  assert.ok(engine.world.bird.y >= engine.world.metrics.birdHitHeight / 2);
  assert.ok(engine.world.bird.velocityY >= 0);
});
