export async function runArcadeTests() {
  const results = [];
  let Trail, gateX, Player, GROUND;
  try {
    ({ Trail, gateX } = await import("./arcade.js?v=7"));
    ({ Player, GROUND } = await import("./world.js?v=7"));
  } catch (error) {
    return [{ name: "Arcade gameplay loads", passed: false, error: error.message }];
  }
  const assert = (value, message) => { if (!value) throw new Error(message); };
  function test(name, action) {
    try { action(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: error.message }); }
  }
  const playerAt = (x, y = GROUND - 44) => {
    const player = new Player();
    player.x = x; player.y = y;
    return player;
  };
  test("routes grow harder while spawn and checkpoint remain safe", () => {
    const first = new Trail(0, GROUND), last = new Trail(17, GROUND);
    assert(last.bots.length > first.bots.length && last.pits.length > first.pits.length, "Difficulty did not increase");
    assert(last.platforms.some(p => p.amplitude) && last.fields.length, "Advanced mechanics missing");
    for (let index = 0; index < 18; index++) {
      const trail = new Trail(index, GROUND);
      assert(trail.start > gateX(index) && trail.end < gateX(index + 1), "Route crosses gates");
      assert(trail.platforms.every(p => GROUND - p.y <= 100), "Unreachable platform");
      assert(!trail.pits.some(p => trail.checkpointX >= p.x && trail.checkpointX <= p.x + p.width), "Checkpoint is inside a pit");
    }
  });
  test("energy cells are collected once rather than farmed every frame", () => {
    const trail = new Trail(0, GROUND), cell = trail.cells[0];
    assert(cell, "Energy cells are missing");
    const player = playerAt(cell.x - 14, cell.y - 22);
    trail.beforeStep(0, player); trail.afterStep(0, player, {});
    assert(trail.energy === 1, "Cell not collected");
    trail.beforeStep(0, player); trail.afterStep(0, player, {});
    assert(trail.energy === 1, "Cell counted twice");
  });
  test("held pulse fire is limited and actually disables a bot", () => {
    const trail = new Trail(0, GROUND), bot = trail.bots[0];
    assert(bot, "Pulse targets are missing");
    const player = playerAt(bot.x - 80);
    for (let i = 0; i < 40; i++) {
      trail.beforeStep(0.016, player); trail.afterStep(0.016, player, { fire: true });
    }
    assert(!bot.alive, "Pulse did not hit the moving bot");
    const empty = new Trail(0, GROUND); empty.bots = [];
    for (let i = 0; i < 15; i++) {
      empty.beforeStep(0.016, player); empty.afterStep(0.016, player, { fire: true });
    }
    assert(empty.projectiles.length === 1, "Fire cooldown did not limit held input");
  });
  test("stomping bounces the player without removing a shield", () => {
    const trail = new Trail(0, GROUND), bot = trail.bots[0];
    assert(bot, "Stomp targets are missing");
    const player = playerAt(bot.x, bot.y - 46);
    player.vy = 120;
    trail.beforeStep(0, player);
    player.y += 4;
    trail.afterStep(0, player, {});
    assert(!bot.alive && player.vy < 0 && trail.hearts === 3, "Stomp was treated as a side hit");
  });
  test("a descending stomp remains a stomp when a slower frame also reaches ground", () => {
    const trail = new Trail(0, GROUND), bot = trail.bots[0], player = new Player();
    player.x = bot.x - 129;
    for (let frame = 0; frame < 45; frame++) {
      const dt = frame === 44 ? 0.05 : 0.016;
      const input = { right: true, jump: frame === 0 };
      trail.beforeStep(dt, player);
      player.step(dt, input, trail.platforms, trail.pits);
      trail.afterStep(dt, player, input);
    }
    assert(!bot.alive && trail.hearts === 3 && player.vy < 0,
      "A ground collision erased the valid descending stomp");
  });
  test("damage grants protection against immediate repeated collisions", () => {
    const trail = new Trail(0, GROUND), bot = trail.bots[0];
    assert(bot, "Collision targets are missing");
    const player = playerAt(bot.x);
    trail.beforeStep(0, player); trail.afterStep(0, player, {});
    assert(trail.hearts === 2, "Side collision did not damage shield");
    player.x = bot.x;
    trail.beforeStep(0.016, player); trail.afterStep(0.016, player, {});
    assert(trail.hearts === 2, "One overlap removed multiple shields");
  });
  test("a checkpoint restores collected energy and retries only the route", () => {
    const trail = new Trail(8, GROUND, { half: true, collected: 3 });
    const player = playerAt(trail.checkpointX);
    assert(trail.energy === 2, "Saved energy was lost");
    trail.hearts = 1;
    trail.invulnerable = 0;
    player.y = GROUND + 120;
    trail.beforeStep(0, player); trail.afterStep(0, player, {});
    assert(trail.hearts === 3 && Math.abs(player.x - trail.checkpointX) < 30, "Retry missed checkpoint");
    assert(trail.energy === 2 && trail.projectiles.length === 0, "Retry lost checkpoint cells or kept old shots");
  });
  test("a grounded player is carried by a moving platform", () => {
    const trail = new Trail(10, GROUND), platform = trail.platforms.find(p => p.amplitude);
    assert(platform, "Moving platforms are missing");
    const player = playerAt(platform.x + 10, platform.y - 44);
    const x = player.x;
    trail.beforeStep(0.05, player);
    assert(player.x !== x && Math.abs(player.x - platform.x - 10) < 0.01, "Platform slid out from under its passenger");
  });
  test("the exit finishes a route without requiring every optional cell", () => {
    const trail = new Trail(0, GROUND), player = playerAt(trail.end);
    trail.beforeStep(0, player);
    const result = trail.afterStep(0, player, {});
    assert(result.finished && trail.energy === 0, "Optional energy blocks the exit");
  });
  test("all 18 routes are traversable using real physics without damage or retries", () => {
    for (let index = 0; index < 18; index++) {
      const trail = new Trail(index, GROUND), player = new Player();
      trail.respawn(player);
      let finished = false, checkpoint = false;
      for (let frame = 0; frame < 1000 && !finished; frame++) {
        const wait = trail.fields.some(f => f.active && player.grounded &&
          f.x - player.x < 65 && f.x > player.x + player.width);
        const jump = player.grounded && !wait && (
          trail.platforms.some(p => player.x < p.x && player.x + player.width >= p.x - 40) ||
          trail.spikes.some(s => player.x < s.x && player.x + player.width >= s.x - 45));
        const input = { right: !wait, jump, fire: true };
        trail.beforeStep(0.016, player);
        player.step(0.016, input, trail.platforms, trail.pits);
        const result = trail.afterStep(0.016, player, input);
        checkpoint ||= result.checkpoint;
        finished = result.finished;
      }
      assert(finished && checkpoint && trail.retries === 0 && trail.hearts === 3,
        `Route ${index + 1} is not safely traversable with ordinary controls`);
    }
  });
  return results;
}
