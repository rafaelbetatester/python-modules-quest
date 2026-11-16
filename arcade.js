export const GATE_SPACING = 1800;
export const gateX = index => 160 + index * GATE_SPACING;
const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x &&
  a.y < b.y + b.height && a.y + a.height > b.y;
const MAPS = [
  { name: "RIFT CAUSEWAY", pits: [360, 1120], spikes: [630, 1430], ledges: [170, 950], fields: [] },
  { name: "SWITCHBACK YARD", pits: [480, 1260], spikes: [230, 1040, 1460], ledges: [330, 1100], fields: [680] },
  { name: "SKYBRIDGE RUINS", pits: [290, 620, 1060, 1390], spikes: [475, 1260], ledges: [170, 920], fields: [] },
  { name: "PULSE FOUNDRY", pits: [520, 1270], spikes: [300, 1030, 1450], ledges: [180, 1110], fields: [680, 1160] },
  { name: "DRONE GARDENS", pits: [400, 1100, 1400], spikes: [650, 1290], ledges: [240, 570, 950, 1230], fields: [990] },
  { name: "GLITCH GAUNTLET", pits: [300, 620, 1040, 1370], spikes: [470, 1200], ledges: [170, 920], fields: [550, 1500] },
];

export class Trail {
  constructor(index, ground, saved = null) {
    if (!Number.isInteger(index) || index < 0 || index >= 18 || !Number.isFinite(ground)) {
      throw new Error("Invalid arcade route.");
    }
    if (saved && (typeof saved.half !== "boolean" || !Number.isInteger(saved.collected) ||
        saved.collected < 0 || saved.collected > 63 || (!saved.half && saved.collected !== 0))) {
      throw new Error("Invalid arcade checkpoint.");
    }
    this.index = index;
    this.ground = ground;
    this.start = gateX(index) + 85;
    this.end = gateX(index + 1) - 80;
    const at = offset => this.start + offset;
    this.checkpointX = at(815);
    this.difficulty = 1 + Math.floor(index / 4);
    const map = MAPS[index % MAPS.length];
    this.mapStyle = index % MAPS.length;
    this.accent = ["#e6c482", "#f0ac86", "#b4c9ff", "#ffae91", "#a9e3ad", "#d0b1ff"][this.mapStyle];
    this.name = `${map.name} ${1 + Math.floor(index / 6)}`;
    const shift = Math.floor(index / 6) * 13;
    this.pits = map.pits.map(offset => ({ x: at(offset - shift), width: 90 + this.difficulty * 7 }));
    this.spikes = map.spikes.map(offset => ({
      x: at(offset - shift), y: ground - 18, width: 30 + this.difficulty * 4, height: 18,
    }));
    this.platforms = [...map.ledges.map((offset, i) => ({
      baseX: at(offset + shift), x: at(offset + shift), y: ground - 60 - (i % 2) * 30,
      width: 80, amplitude: index >= 6 && i % 2 === 0 ? 28 : 0,
    })), ...this.pits.map((pit, i) => ({
      baseX: pit.x + 25, x: pit.x + 25, y: ground - 70, width: 65,
      amplitude: index >= 8 && i % 2 === 0 ? 24 : 0,
    }))];
    this.fields = map.fields.map((offset, i) => ({
      x: at(offset - shift), y: ground - 112, width: 26, height: 112,
      active: false, phase: i * 1.7 + index * 0.4,
    }));
    const candidates = [];
    for (let offset = 155; offset < 1500; offset += 40) {
      const x = at(offset);
      if (Math.abs(x - this.checkpointX) < 120 ||
          [...this.pits, ...this.spikes, ...this.fields].some(p => x + 70 > p.x && x - 40 < p.x + p.width)) continue;
      candidates.push(x);
    }
    const kinds = index < 2 ? ["patrol", "armored"] : index < 5
      ? ["patrol", "armored", "hopper"] : ["patrol", "armored", "hopper", "drone", "sentry"];
    this.bots = Array.from({ length: 5 + Math.floor(index / 2) }, (_, i) => {
      const kind = kinds[i % kinds.length];
      const x = candidates[Math.floor(i * candidates.length / (5 + Math.floor(index / 2)))];
      return {
        kind, x, spawnX: x, y: ground - (kind === "drone" ? 102 : 24),
        width: 28, height: 24, alive: true, direction: i % 2 ? -1 : 1,
        left: x - 28, right: x + 28, speed: 62 + index * 3,
        hp: kind === "armored" ? 2 : 1, phase: i * 0.9,
        attack: 0.9 + (i % 3) * 0.25, warning: false,
      };
    });
    this.cells = [190, 450, 700, 980, 1210, 1500].map((offset, i) => ({
      x: at(offset), y: ground - (i % 2 ? 110 : 45), bit: 1 << i,
    }));
    this.projectiles = [];
    this.enemyShots = [];
    this.hearts = 3;
    this.saved = saved ? { half: saved.half, collected: saved.collected } : { half: false, collected: 0 };
    this.collected = this.saved.collected;
    this.time = 0;
    this.cooldown = 0;
    this.invulnerable = 0;
    this.retries = 0;
  }
  get energy() { return this.cells.filter(cell => this.collected & cell.bit).length; }
  safeAt(player) {
    const center = player.x + player.width / 2;
    return [this.start, this.checkpointX, this.end].some(x => Math.abs(center - x - 14) < 55);
  }
  respawn(player) {
    player.x = this.saved.half ? this.checkpointX : this.start;
    player.y = this.ground - player.height;
    player.vy = 0;
    player.grounded = true;
    player.jumpHeld = false;
    this.hearts = 3;
    this.invulnerable = 1.25;
    this.collected = this.saved.collected;
    this.projectiles = [];
    this.enemyShots = [];
    this.time = 0;
    this.cooldown = 0;
    this.bots.forEach((bot, i) => {
      bot.alive = true;
      bot.x = bot.spawnX;
      bot.y = this.ground - (bot.kind === "drone" ? 102 : 24);
      bot.hp = bot.kind === "armored" ? 2 : 1;
      bot.direction = i % 2 ? -1 : 1;
      bot.attack = 0.9 + (i % 3) * 0.25;
      bot.warning = false;
    });
    this.platforms.forEach(platform => { platform.x = platform.baseX; });
    this.fields.forEach(field => { field.active = false; });
  }
  beforeStep(dt, player) {
    dt = Math.min(Math.max(dt, 0), 0.05);
    this.time += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.previousBottom = player.y + player.height;
    this.platforms.forEach(platform => {
      const oldX = platform.x;
      platform.x = platform.baseX + Math.sin(this.time * 1.6) * platform.amplitude;
      if (player.grounded && Math.abs(player.y + player.height - platform.y) < 1 &&
          player.x + player.width > oldX && player.x < oldX + platform.width) player.x += platform.x - oldX;
    });
    this.bots.forEach(bot => {
      if (!bot.alive) return;
      if (bot.kind !== "sentry") bot.x += bot.direction * bot.speed * dt;
      if (bot.x >= bot.right || bot.x <= bot.left) {
        bot.x = Math.max(bot.left, Math.min(bot.right, bot.x));
        bot.direction *= -1;
      }
      if (bot.kind === "hopper") bot.y = this.ground - 24 - Math.abs(Math.sin(this.time * 3.8 + bot.phase)) * 72;
      if (bot.kind === "drone") bot.y = this.ground - 102 + Math.sin(this.time * 2.4 + bot.phase) * 25;
      const distance = player.x - bot.x;
      if (bot.kind === "sentry" && Math.abs(distance) < 365 && !this.safeAt(player)) {
        bot.attack = Math.max(0, bot.attack - dt);
        bot.warning = bot.attack < 0.45;
        if (bot.attack === 0) {
          const dx = player.x + player.width / 2 - (bot.x + 14);
          const dy = player.y + player.height / 2 - (bot.y + 12);
          const length = Math.max(1, Math.hypot(dx, dy));
          this.enemyShots.push({
            x: bot.x + 10, y: bot.y + 8, width: 10, height: 8,
            vx: dx / length * 220, vy: dy / length * 220, life: 1.8,
          });
          bot.attack = Math.max(1.05, 1.8 - this.index * 0.025);
          bot.warning = false;
        }
      } else {
        bot.warning = false;
        if (bot.kind === "sentry") bot.attack = Math.max(bot.attack, 0.6);
      }
    });
    this.fields.forEach(field => { field.active = Math.sin(this.time * 2.3 + field.phase) > -0.15; });
  }
  afterStep(dt, player, input) {
    dt = Math.min(Math.max(dt, 0), 0.05);
    const result = { checkpoint: false, finished: false };
    if (player.y > this.ground + 90) {
      this.retries++;
      this.respawn(player);
      return result;
    }
    if (input.fire && this.cooldown === 0) {
      this.cooldown = 0.48;
      this.projectiles.push({
        x: player.x + (player.facing > 0 ? player.width : -12), y: player.y + 20,
        width: 12, height: 7, direction: player.facing, life: 0.52,
      });
    }
    this.projectiles = this.projectiles.filter(shot => {
      shot.x += shot.direction * 620 * dt;
      shot.life -= dt;
      const target = this.bots.find(bot => bot.alive && overlap(shot, bot));
      if (target) { target.hp--; target.alive = target.hp > 0; }
      return shot.life > 0 && !target;
    });
    this.cells.forEach(cell => {
      if (overlap(player, { x: cell.x - 9, y: cell.y - 9, width: 18, height: 18 })) this.collected |= cell.bit;
    });
    let hit = this.spikes.some(spike => overlap(player, spike)) ||
      this.fields.some(field => field.active && overlap(player, field));
    this.enemyShots = this.enemyShots.filter(shot => {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      const touched = overlap(player, shot);
      if (touched && !this.safeAt(player)) hit = true;
      return shot.life > 0 && !touched &&
        !this.safeAt({ x: shot.x, width: shot.width });
    });
    this.bots.forEach(bot => {
      if (!bot.alive || !overlap(player, bot)) return;
      if (this.previousBottom <= bot.y + 5 && player.y + player.height >= this.previousBottom) {
        bot.alive = false;
        player.y = bot.y - player.height;
        player.vy = -360;
        player.grounded = false;
      } else hit = true;
    });
    if (hit && this.invulnerable === 0) {
      this.hearts--;
      this.invulnerable = 1.25;
      player.x -= player.facing * 20;
      player.vy = -230;
      player.grounded = false;
      if (this.hearts === 0) { this.retries++; this.respawn(player); }
    }
    if (!this.saved.half && player.x >= this.checkpointX && player.grounded &&
        player.y + player.height === this.ground) {
      this.saved = { half: true, collected: this.collected };
      result.checkpoint = true;
    }
    result.finished = player.x + player.width / 2 >= this.end && player.grounded;
    return result;
  }
}
