export async function runArcadeTests() {
  const results = [];
  let Trail, gateX, Player, GROUND;
  try {
    ({ Trail, gateX } = await import("./arcade.js?v=8"));
    ({ Player, GROUND } = await import("./world.js?v=8"));
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
  test("every route has a distinct obstacle layout and denser enemy encounters", () => {
    const shapes = new Set();
    for (let index = 0; index < 18; index++) {
      const trail = new Trail(index, GROUND);
      assert(trail.bots.length >= 5 + Math.floor(index / 2), `Route ${index + 1} is still sparse`);
      shapes.add(JSON.stringify([trail.pits, trail.spikes, trail.platforms].map(items =>
        items.map(item => [Math.round(item.x - trail.start), item.width, item.y]))));
      assert(trail.pits.length >= 2 && trail.spikes.length >= 2, "Route lacks meaningful terrain");
      for (const x of [trail.start, trail.checkpointX, trail.end]) {
        assert(!trail.pits.some(p => x + 28 > p.x && x < p.x + p.width), "Unsafe spawn/checkpoint/exit");
        assert(!trail.spikes.some(p => x + 28 > p.x && x < p.x + p.width), "Hazard at a safe zone");
      }
    }
    assert(shapes.size === 18, "Stages reuse the same terrain with only different colors");
    const types = new Set(new Trail(17, GROUND).bots.map(bot => bot.kind));
    assert(["patrol", "armored", "hopper", "drone", "sentry"].every(kind => types.has(kind)), "Enemy variety is missing");
  });
  test("holding right and fire without learning the terrain cannot clear any route", () => {
    for (let index = 0; index < 18; index++) {
      const trail = new Trail(index, GROUND), player = new Player();
      trail.respawn(player);
      let finished = false;
      for (let frame = 0; frame < 1100 && !finished; frame++) {
        const input = { right: true, fire: true };
        trail.beforeStep(0.016, player);
        player.step(0.016, input, trail.platforms, trail.pits);
        finished = trail.afterStep(0.016, player, input).finished;
      }
      assert(!finished && trail.retries > 0, `Route ${index + 1} is still cleared by holding two keys`);
    }
  });
  test("armored enemies absorb a pulse but a stomp still defeats them", () => {
    const trail = new Trail(7, GROUND), bot = trail.bots.find(b => b.kind === "armored");
    assert(bot, "Armored encounter is missing");
    trail.bots = [bot];
    const player = playerAt(bot.x - 50);
    trail.projectiles.push({ x: bot.x, y: bot.y + 10, width: 12, height: 7, direction: 1, life: 0.1 });
    trail.beforeStep(0, player); trail.afterStep(0, player, {});
    assert(bot.alive && bot.hp === 1, "Armor did not absorb its first hit");
    player.x = bot.x; player.y = bot.y - player.height - 2; player.vy = 120;
    trail.beforeStep(0, player); player.y += 4; trail.afterStep(0, player, {});
    assert(!bot.alive && player.vy < 0 && trail.hearts === 3, "Armored bot cannot be stomped");
  });
  test("hoppers and drones attack from different vertical lanes", () => {
    const trail = new Trail(17, GROUND);
    const hopper = trail.bots.find(b => b.kind === "hopper"), drone = trail.bots.find(b => b.kind === "drone");
    assert(hopper && drone, "Airborne enemies are missing");
    const y = hopper.y, player = playerAt(trail.start);
    for (let i = 0; i < 30; i++) trail.beforeStep(0.016, player);
    assert(hopper.y < y && drone.y + drone.height < GROUND - 35, "Enemies are all ground patrols");
  });
  test("sentries telegraph aimed shots that damage once and cannot spawn-camp checkpoints", () => {
    const trail = new Trail(17, GROUND), bot = trail.bots.find(b => b.kind === "sentry");
    assert(bot, "Ranged encounter is missing");
    const player = playerAt(bot.x + 150);
    trail.bots = [bot];
    for (let frame = 0; frame < 120; frame++) trail.beforeStep(0.016, player);
    assert(trail.enemyShots?.length > 0, "Sentry never fired");
    trail.enemyShots = [{ x: player.x, y: player.y + 20, width: 10, height: 8, vx: -200, vy: 0, life: 1 }];
    trail.afterStep(0, player, {});
    assert(trail.hearts === 2, "Hostile projectile does not damage the player");
    trail.afterStep(0, player, {});
    assert(trail.hearts === 2, "Same shot drained multiple shields");
    player.x = trail.checkpointX;
    trail.enemyShots = [{ x: player.x, y: player.y + 20, width: 10, height: 8, vx: -200, vy: 0, life: 1 }];
    trail.invulnerable = 0;
    trail.afterStep(0, player, {});
    assert(trail.hearts === 2, "Checkpoint was not a safe sanctuary");
  });
  test("retry resets enemy positions, armor, shot cooldowns and moving terrain", () => {
    const trail = new Trail(17, GROUND), fresh = new Trail(17, GROUND), player = playerAt(trail.start);
    for (let frame = 0; frame < 150; frame++) trail.beforeStep(0.016, player);
    trail.bots.forEach(bot => { bot.hp = 0; bot.alive = false; });
    trail.cooldown = 1;
    trail.respawn(player);
    assert(trail.time === 0 && trail.cooldown === 0 && trail.enemyShots?.length === 0, "Retry kept the previous combat state");
    assert(trail.bots.every((bot, i) => bot.x === fresh.bots[i].x && bot.y === fresh.bots[i].y &&
      bot.hp === fresh.bots[i].hp && bot.alive), "Retry did not reset the encounters fairly");
  });
  test("a sentry gives a fresh warning when the player leaves checkpoint safety", () => {
    const trail = new Trail(6, GROUND), bot = trail.bots.find(b => b.kind === "sentry");
    const player = playerAt(trail.checkpointX);
    bot.attack = 0.01;
    trail.bots = [bot];
    trail.beforeStep(0.016, player);
    player.x = [bot.x - 120, bot.x + 120, bot.x - 200, bot.x + 200]
      .find(x => !trail.safeAt({ x, width: player.width }));
    trail.beforeStep(0.016, player);
    assert(trail.enemyShots.length === 0, "Sentry fired immediately after safety without a visible warning");
    let warningFrames = 0;
    for (let frame = 0; frame < 100 && !trail.enemyShots.length; frame++) {
      if (bot.warning) warningFrames++;
      trail.beforeStep(0.016, player);
    }
    assert(trail.enemyShots.length > 0 && warningFrames >= 20, "Reacquired attack did not give enough warning time");
  });
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
    trail.bots = [bot];
    player.x = bot.x; player.y = bot.y - player.height - 6;
    player.vy = 600; player.grounded = false;
    trail.beforeStep(0.05, player);
    player.step(0.05, {});
    trail.afterStep(0.05, player, {});
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
  test("all 18 complete encounters can be beaten with real controls and no retries", () => {
    for (let index = 0; index < 18; index++) {
      const trail = new Trail(index, GROUND), player = new Player();
      trail.respawn(player);
      let beam = [{ trail, player }], solution = null;
      // Explore ordinary 100ms input sequences, including waits for timed hazards.
      for (let generation = 0; generation < 180 && !solution; generation++) {
        const next = [], seen = new Set();
        for (const node of beam) {
          for (const input of [{ right: true, fire: true }, { right: true, jump: true, fire: true },
            { fire: true }, { jump: true, fire: true }, { left: true, fire: true }]) {
            const t = Object.assign(Object.create(Trail.prototype), structuredClone(node.trail));
            const p = Object.assign(Object.create(Player.prototype), structuredClone(node.player));
            let finished = false;
            for (let frame = 0; frame < 5; frame++) {
              t.beforeStep(0.02, p);
              p.step(0.02, input, t.platforms, t.pits);
              finished = t.afterStep(0.02, p, input).finished;
              if (finished || t.retries) break;
            }
            if (t.retries) continue;
            if (finished) { solution = t; break; }
            const key = [Math.round((p.x - t.start) / 12), Math.round(p.y / 12),
              Math.round(p.vy / 100), p.jumpHeld, t.hearts].join("/");
            if (seen.has(key)) continue;
            seen.add(key);
            next.push({ trail: t, player: p, score: p.x - t.start + t.hearts * 120 -
              (p.y > GROUND - p.height ? 300 : 0) });
          }
          if (solution) break;
        }
        next.sort((a, b) => b.score - a.score);
        beam = next.slice(0, 65);
        if (!beam.length) break;
      }
      assert(solution?.saved.half && solution.retries === 0 && solution.hearts > 0,
        `Route ${index + 1} has no verified playable path through its full encounter`);
    }
  });
  return results;
}
