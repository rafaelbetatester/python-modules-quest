export const GATE_SPACING = 1800;
export const gateX = index => 160 + index * GATE_SPACING;
const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x &&
  a.y < b.y + b.height && a.y + a.height > b.y;

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
    const scale = (this.end - this.start) / 675;
    // Stretch travel distances, not pit widths or jump heights.
    const at = offset => this.start + offset * scale;
    this.checkpointX = at(350);
    this.difficulty = 1 + Math.floor(index / 4);
    this.bots = [170, 430, 600, 100].slice(0, 1 + Math.floor(index / 5)).map((offset, i) => ({
      x: at(offset), y: ground - 24, width: 28, height: 24, alive: true, direction: 1,
      left: at(offset - 20), right: at(offset + 35), speed: 38 + index * 3 + i * 4,
    }));
    this.pits = index < 3 ? [] : [{ x: at(250), width: 64 + this.difficulty * 3 }];
    if (index >= 12) this.pits.push({ x: at(510), width: 80 });
    this.platforms = [{ baseX: at(230), x: at(230), y: ground - 60, width: 100, amplitude: index >= 8 ? 24 : 0 }];
    if (index >= 12) this.platforms.push({
      baseX: at(490), x: at(490), y: ground - 75, width: 110, amplitude: index >= 15 ? 24 : 0,
    });
    this.spikes = index >= 5 ? [{ x: at(390), y: ground - 16, width: 28, height: 16 }] : [];
    this.fields = index >= 9 ? [{ x: at(455), y: ground - 70, width: 24, height: 70, active: false }] : [];
    this.cells = [100, 180, 280, 400, 510, 610].map((offset, i) => ({
      x: at(offset), y: ground - (i === 2 || (i === 4 && index >= 12) ? 105 : 42), bit: 1 << i,
    }));
    this.projectiles = [];
    this.hearts = 3;
    this.saved = saved ? { half: saved.half, collected: saved.collected } : { half: false, collected: 0 };
    this.collected = this.saved.collected;
    this.time = 0;
    this.cooldown = 0;
    this.invulnerable = 0;
    this.retries = 0;
  }
  get energy() { return this.cells.filter(cell => this.collected & cell.bit).length; }
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
    this.bots.forEach(bot => { bot.alive = true; });
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
      bot.x += bot.direction * bot.speed * dt;
      if (bot.x >= bot.right || bot.x <= bot.left) {
        bot.x = Math.max(bot.left, Math.min(bot.right, bot.x));
        bot.direction *= -1;
      }
    });
    this.fields.forEach(field => { field.active = Math.sin(this.time * 2.5) > 0.3; });
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
      this.cooldown = 0.35;
      this.projectiles.push({
        x: player.x + (player.facing > 0 ? player.width : -12), y: player.y + 20,
        width: 12, height: 7, direction: player.facing, life: 0.9,
      });
    }
    this.projectiles = this.projectiles.filter(shot => {
      shot.x += shot.direction * 620 * dt;
      shot.life -= dt;
      const target = this.bots.find(bot => bot.alive && overlap(shot, bot));
      if (target) target.alive = false;
      return shot.life > 0 && !target;
    });
    this.cells.forEach(cell => {
      if (overlap(player, { x: cell.x - 9, y: cell.y - 9, width: 18, height: 18 })) this.collected |= cell.bit;
    });
    let hit = this.spikes.some(spike => overlap(player, spike)) ||
      this.fields.some(field => field.active && overlap(player, field));
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
