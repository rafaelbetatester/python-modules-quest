import { CHALLENGES, starsFor } from "./campaign.js?v=7";
import { Trail, gateX, GATE_SPACING } from "./arcade.js?v=7";

export const GROUND = 340;
export const WORLD_WIDTH = 160 + CHALLENGES.length * GATE_SPACING;
const HEIGHT = 420;
const REGIONS = [
  { name: "SUNRISE MEADOW", sky: "#a4dfef", haze: "#e0f1de", hill: "#87b996", front: "#4f9274", grass: "#70c46c", soil: "#735844" },
  { name: "EMERALD WOODS", sky: "#b3dcca", haze: "#e3e9bc", hill: "#76a998", front: "#3e796a", grass: "#85ba5c", soil: "#665442" },
  { name: "CRYSTAL COAST", sky: "#9bd4ee", haze: "#e8e9c3", hill: "#6fabb7", front: "#397d96", grass: "#dcd593", soil: "#927b63" },
  { name: "STARLIGHT SUMMIT", sky: "#353d70", haze: "#77739f", hill: "#555687", front: "#393c64", grass: "#a1a0cf", soil: "#5d5372" },
];

export class Player {
  constructor() {
    this.width = 28;
    this.height = 44;
    this.x = 65;
    this.y = GROUND - this.height;
    this.vy = 0;
    this.grounded = true;
    this.jumpHeld = false;
    this.facing = 1;
    this.walk = 0;
  }

  step(dt, input, platforms = [], pits = []) {
    dt = Math.min(Math.max(dt, 0), 0.05);
    const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
    if (direction) { this.facing = direction; this.walk += dt * 12; }
    this.x = Math.max(0, Math.min(WORLD_WIDTH - this.width, this.x + direction * 245 * dt));
    if (input.jump && !this.jumpHeld && this.grounded) { this.vy = -540; this.grounded = false; }
    this.jumpHeld = Boolean(input.jump);
    const bottom = this.y + this.height;
    this.vy += 1400 * dt;
    this.y += this.vy * dt;
    this.grounded = false;
    const floors = platforms.filter(p => this.x + this.width > p.x && this.x < p.x + p.width &&
      bottom <= p.y && this.y + this.height >= p.y && this.vy >= 0).map(p => p.y);
    const center = this.x + this.width / 2;
    const ground = pits.some(p => center > p.x && center < p.x + p.width) ? Infinity : GROUND;
    const floor = floors.length ? Math.min(ground, ...floors) : ground;
    if (bottom <= floor && this.y + this.height >= floor && this.vy >= 0) {
      this.y = floor - this.height;
      this.vy = 0;
      this.grounded = true;
    }
  }
}

function star(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 ? size * 0.45 : size;
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
}

export class World {
  constructor(canvas, campaign, enter, nearby, arcadeChanged = () => {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (!this.ctx) throw new Error("The 2D world could not initialize.");
    this.campaign = campaign;
    this.enter = enter;
    this.nearby = nearby;
    this.arcadeChanged = arcadeChanged;
    this.trail = null;
    this.player = new Player();
    this.keys = {};
    this.paused = false;
    this.camera = 0;
    this.width = 900;
    this.lastTime = 0;
    this.lastNearby = undefined;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.platforms = CHALLENGES.map((_, i) => ({ x: gateX(i) + 125, y: 274, width: 100 }));
    canvas.addEventListener("keydown", event => this.key(event, true));
    canvas.addEventListener("keyup", event => this.key(event, false));
    canvas.addEventListener("blur", () => this.clearKeys());
    canvas.addEventListener("pointerdown", () => canvas.focus());
    window.addEventListener("blur", () => this.clearKeys());
    document.addEventListener("visibilitychange", () => { this.clearKeys(); this.lastTime = 0; });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.setCampaign(campaign);
    this.frame = time => {
      const dt = this.lastTime ? (time - this.lastTime) / 1000 : 0;
      this.lastTime = time;
      if (!this.paused && !document.hidden) this.step(dt);
      this.camera = Math.max(0, Math.min(WORLD_WIDTH - this.width, this.player.x - this.width * 0.4));
      const index = this.nearest();
      if (index !== this.lastNearby) { this.lastNearby = index; this.nearby(index); }
      if (!document.hidden) this.draw(this.reducedMotion.matches ? 0 : time / 1000);
      this.animation = requestAnimationFrame(this.frame);
    };
    this.animation = requestAnimationFrame(this.frame);
  }

  resize() {
    this.width = Math.max(280, this.canvas.clientWidth);
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * scale);
    this.canvas.height = HEIGHT * scale;
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  clearKeys() { this.keys = {}; this.player.jumpHeld = false; }
  pause(value) { this.paused = value; this.clearKeys(); }
  setCampaign(campaign) {
    this.campaign = campaign;
    this.trail = null;
    this.lastHUD = "";
    this.lastNearby = undefined;
    let gate = Math.min(campaign.completed, CHALLENGES.length - 1);
    if (!campaign.canEnter(gate)) gate = Math.max(0, gate - 1);
    this.travelTo(campaign.active?.challenge ?? gate);
    if (campaign.trail) {
      this.trail = new Trail(campaign.trail.index, GROUND, campaign.trail);
      this.trail.respawn(this.player);
    }
  }
  beginTrail(index) {
    this.campaign.beginTrail(index);
    this.trail = new Trail(index, GROUND);
    this.trail.respawn(this.player);
    this.clearKeys();
    this.lastHUD = "";
    this.arcadeChanged("start", this.trail);
  }
  skipTrail(index) {
    this.campaign.finishTrail(index, 0);
    this.trail = null;
    this.travelTo(index + 1);
    this.arcadeChanged("skip", null);
  }
  step(dt) {
    if (this.trail) {
      const trail = this.trail;
      trail.beforeStep(dt, this.player);
      this.player.step(dt, this.keys, trail.platforms, trail.pits);
      this.player.x = Math.max(trail.start, this.player.x);
      const result = trail.afterStep(dt, this.player, this.keys);
      if (result.checkpoint) {
        this.campaign.checkpointTrail(trail.saved.collected);
        this.arcadeChanged("checkpoint", trail);
      }
      if (result.finished) {
        this.campaign.finishTrail(trail.index, trail.energy);
        this.trail = null;
        this.travelTo(trail.index + 1);
        this.arcadeChanged("finish", trail);
      } else {
        const hud = [trail.energy, trail.hearts, trail.retries, trail.saved.half].join("/");
        if (hud !== this.lastHUD) { this.lastHUD = hud; this.arcadeChanged("hud", trail); }
      }
      return;
    }
    this.player.step(dt, this.keys, this.platforms);
    let gate = Math.min(this.campaign.completed, CHALLENGES.length - 1);
    if (!this.campaign.canEnter(gate)) gate = Math.max(0, gate - 1);
    this.player.x = Math.min(this.player.x, gateX(gate) + (this.campaign.completed === 19 ? 210 : 95));
    if (!this.campaign.active && gate < 18 && this.campaign.awards[gate] &&
        this.campaign.trails[gate] === null && this.player.x >= gateX(gate) + 85) this.beginTrail(gate);
  }
  travelTo(index) {
    this.player.x = gateX(index) - 55;
    this.player.y = GROUND - this.player.height;
    this.player.vy = 0;
    this.player.grounded = true;
    this.clearKeys();
  }
  nearest() {
    if (this.trail) return null;
    const index = Math.round((this.player.x + this.player.width / 2 - 160) / GATE_SPACING);
    return index >= 0 && index < CHALLENGES.length &&
      Math.abs(this.player.x + this.player.width / 2 - gateX(index)) < 80 ? index : null;
  }
  interact() {
    if (this.paused) return;
    const index = this.nearest();
    if (index !== null) this.enter(index);
  }
  key(event, pressed) {
    if (pressed && (this.paused || event.ctrlKey || event.metaKey || event.altKey)) return;
    const action = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right",
      " ": "jump", ArrowUp: "jump", w: "jump", W: "jump",
      x: "fire", X: "fire", j: "fire", J: "fire" }[event.key];
    if (action) { event.preventDefault(); this.keys[action] = pressed; }
    else if (event.key === "Enter" && pressed && !event.repeat) { event.preventDefault(); this.interact(); }
  }
  bindControl(button, action) {
    button.addEventListener("pointerdown", event => {
      if (this.paused) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      this.canvas.focus({ preventScroll: true });
      this.keys[action] = true;
    });
    const release = () => { this.keys[action] = false; };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("keydown", event => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault(); if (!this.paused) this.keys[action] = true;
      }
    });
    button.addEventListener("keyup", event => {
      if (event.key === " " || event.key === "Enter") { event.preventDefault(); release(); }
    });
    button.addEventListener("blur", release);
  }

  draw(time) {
    const ctx = this.ctx;
    const regionIndex = CHALLENGES[Math.min(CHALLENGES.length - 1,
      Math.max(0, Math.round((this.player.x - 160) / GATE_SPACING)))].region;
    const region = REGIONS[regionIndex];
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, region.sky); sky.addColorStop(1, region.haze);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, this.width, HEIGHT);
    if (regionIndex === 3) {
      for (let i = 0; i < 35; i++) {
        ctx.fillStyle = i % 3 ? "#dedcf0" : "#ffeab0";
        ctx.fillRect((i * 79 - this.camera * 0.1 % this.width + this.width) % this.width,
          20 + i * 37 % 160, 2, 2);
      }
    }
    ctx.fillStyle = regionIndex === 3 ? "#fff1c2" : "#ffed9d";
    ctx.fillRect(this.width - 125, 43, 42, 42);
    ctx.fillRect(this.width - 130, 50, 52, 28);
    for (let i = -1; i < 7; i++) {
      const x = i * 215 - this.camera * 0.18 % 215;
      const y = 48 + (i + 7) % 3 * 24;
      ctx.fillStyle = regionIndex === 3 ? "#8f91ba" : "#f7fcf0";
      ctx.fillRect(x + 15, y, 50, 16); ctx.fillRect(x, y + 16, 96, 18);
    }
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer ? region.front : region.hill;
      const spacing = layer ? 270 : 390;
      const offset = this.camera * (layer ? 0.4 : 0.25) % spacing;
      for (let i = -1; i < this.width / spacing + 1; i++) {
        const x = i * spacing - offset;
        ctx.beginPath(); ctx.moveTo(x - 80, GROUND);
        ctx.lineTo(x + spacing * 0.45, layer ? 190 : 120);
        ctx.lineTo(x + spacing + 80, GROUND); ctx.closePath(); ctx.fill();
      }
    }
    ctx.save(); ctx.translate(-Math.floor(this.camera), 0);
    for (let i = Math.floor(this.camera / 180) - 1; i < (this.camera + this.width) / 180 + 1; i++) {
      const x = i * 180 + 40;
      if (regionIndex === 2) {
        ctx.fillStyle = "#a5d1c0"; ctx.fillRect(x, 305, 20, 35);
        ctx.fillStyle = "#cdf1e7"; ctx.fillRect(x - 5, 295, 30, 18);
      } else {
        ctx.fillStyle = "#6a5748"; ctx.fillRect(x + 26, 258, 12, 82);
        ctx.fillStyle = regionIndex === 3 ? "#77719e" : "#387e68";
        ctx.fillRect(x + 8, 220, 50, 52); ctx.fillRect(x, 240, 68, 36);
        ctx.fillStyle = regionIndex === 3 ? "#9289bb" : "#519877";
        ctx.fillRect(x + 14, 222, 32, 17);
      }
    }
    ctx.fillStyle = region.soil; ctx.fillRect(0, GROUND, WORLD_WIDTH, HEIGHT - GROUND);
    ctx.fillStyle = region.grass; ctx.fillRect(0, GROUND, WORLD_WIDTH, 12);
    ctx.fillStyle = "#0002";
    for (let x = Math.floor(this.camera / 32) * 32; x < this.camera + this.width; x += 32) {
      ctx.fillRect(x, GROUND + 28, 14, 5); ctx.fillRect(x + 17, GROUND + 55, 9, 5);
    }
    if (this.trail) this.trail.pits.forEach(p => {
      ctx.fillStyle = "#101b32"; ctx.fillRect(p.x, GROUND, p.width, HEIGHT - GROUND);
      ctx.fillStyle = "#84dbe1"; ctx.fillRect(p.x - 4, GROUND, 4, 12);
      ctx.fillRect(p.x + p.width, GROUND, 4, 12);
    });
    (this.trail ? this.trail.platforms : this.platforms).forEach(p => {
      if (p.x + p.width < this.camera || p.x > this.camera + this.width) return;
      ctx.fillStyle = region.soil; ctx.fillRect(p.x, p.y, p.width, 20);
      ctx.fillStyle = p.amplitude ? "#78e0f2" : region.grass; ctx.fillRect(p.x, p.y, p.width, 7);
      ctx.fillStyle = "#afccb1"; ctx.fillRect(p.x + 48, p.y - 17, 4, 17);
      ctx.fillStyle = "#e2e5ba"; ctx.fillRect(p.x + 52, p.y - 17, 15, 9);
    });
    CHALLENGES.forEach((challenge, index) => {
      const x = gateX(index);
      if (x < this.camera - 90 || x > this.camera + this.width + 90) return;
      const unlocked = this.campaign.canEnter(index);
      const award = this.campaign.awards[index];
      const stars = award ? starsFor(award.firstTry, challenge.ids.length) : 0;
      const arch = unlocked ? "#fff1bd" : "#a8adb5";
      ctx.fillStyle = "#0002"; ctx.fillRect(x - 40, GROUND - 4, 85, 9);
      ctx.fillStyle = arch;
      ctx.fillRect(x - 34, 249, 12, 91); ctx.fillRect(x + 22, 249, 12, 91);
      ctx.fillRect(x - 34, 241, 68, 16); ctx.fillRect(x - 24, 232, 48, 12);
      ctx.fillStyle = award ? "#9fe3b3" : unlocked ? "#6094ba" : "#747987";
      ctx.fillRect(x - 22, 257, 44, 83);
      ctx.fillStyle = "#ffffff25"; ctx.fillRect(x - 17, 260, 8, 73);
      ctx.fillStyle = "#17263c"; ctx.font = "bold 18px monospace"; ctx.textAlign = "center";
      ctx.fillText(unlocked ? String(index + 1).padStart(2, "0") : "X", x, 299);
      for (let j = 0; j < 3; j++) star(ctx, x - 23 + j * 23, 211, 9, j < stars ? "#ffe69b" : "#526072");
      ctx.fillStyle = "#17263ce8"; ctx.fillRect(x - 76, 165, 152, 26);
      ctx.fillStyle = "#fff4d9"; ctx.font = "bold 11px monospace";
      ctx.fillText(challenge.name, x, 182);
      if (this.nearest() === index && unlocked && !this.paused) {
        ctx.fillStyle = "#fff4d9"; ctx.fillRect(x - 63, 123, 126, 29);
        ctx.fillStyle = "#17263c"; ctx.font = "bold 12px monospace";
        ctx.fillText(award ? "ENTER: REPLAY" : "ENTER: START", x, 142);
      }
      if (index === CHALLENGES.length - 1) {
        ctx.fillStyle = "#e2d9f4"; ctx.fillRect(x + 70, 200, 95, 140);
        ctx.fillStyle = "#9a91bd"; ctx.fillRect(x + 80, 184, 14, 25);
        ctx.fillRect(x + 105, 184, 14, 25); ctx.fillRect(x + 130, 184, 14, 25);
        ctx.fillStyle = "#57587e"; ctx.fillRect(x + 97, 285, 36, 55);
        ctx.fillRect(x + 84, 226, 13, 23); ctx.fillRect(x + 135, 226, 13, 23);
        ctx.fillStyle = "#ffe69b"; ctx.fillRect(x + 115, 151, 3, 45);
        ctx.fillRect(x + 118, 151, 30, 17);
      }
    });
    if (this.trail) this.drawTrail();
    this.drawPlayer(time);
    ctx.restore();
    ctx.textAlign = "left"; ctx.fillStyle = "#17263ce8"; ctx.fillRect(16, 16, 208, 30);
    ctx.fillStyle = "#fff4d9"; ctx.font = "bold 12px monospace"; ctx.fillText(region.name, 28, 36);
    if (this.trail) {
      ctx.fillStyle = "#17263ce8"; ctx.fillRect(16, 53, Math.min(310, this.width - 32), 30);
      ctx.fillStyle = "#91f0e0"; ctx.fillText(`BYTE RUN ${this.trail.index + 1} / DIFFICULTY ${this.trail.difficulty}`, 28, 73);
    }
  }

  drawTrail() {
    const { ctx, trail } = this;
    trail.cells.forEach(cell => {
      if (trail.collected & cell.bit) return;
      ctx.fillStyle = "#ffe9a0"; ctx.fillRect(cell.x - 9, cell.y - 7, 18, 14);
      ctx.fillStyle = "#1b4453"; ctx.fillRect(cell.x - 3, cell.y - 4, 6, 8);
      ctx.fillStyle = "#fff8dd"; ctx.fillRect(cell.x - 5, cell.y - 11, 10, 3);
    });
    trail.bots.forEach(bot => {
      if (!bot.alive) return;
      ctx.fillStyle = "#283251"; ctx.fillRect(bot.x + 3, bot.y + 16, 7, 8);
      ctx.fillRect(bot.x + 18, bot.y + 16, 7, 8);
      ctx.fillStyle = "#d97187"; ctx.fillRect(bot.x, bot.y + 3, 28, 16);
      ctx.fillStyle = "#ffd39f"; ctx.fillRect(bot.x + 4, bot.y + 7, 20, 5);
      ctx.fillStyle = "#192c42"; ctx.fillRect(bot.x + 7, bot.y + 7, 3, 5);
      ctx.fillRect(bot.x + 18, bot.y + 7, 3, 5);
      ctx.fillStyle = "#9ce8df"; ctx.fillRect(bot.x + 12, bot.y - 4, 4, 7);
    });
    trail.projectiles.forEach(shot => {
      ctx.fillStyle = "#b2ffff"; ctx.fillRect(shot.x, shot.y, shot.width, shot.height);
      ctx.fillStyle = "#4cc8e2"; ctx.fillRect(shot.x - shot.direction * 10, shot.y + 2, 10, 3);
    });
    trail.spikes.forEach(spike => {
      ctx.fillStyle = "#ffd193";
      for (let x = spike.x; x < spike.x + spike.width; x += 10) {
        ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 5, spike.y);
        ctx.lineTo(x + 10, GROUND); ctx.closePath(); ctx.fill();
      }
    });
    trail.fields.forEach(field => {
      ctx.fillStyle = field.active ? "#ffac89" : "#75beab";
      ctx.fillRect(field.x - 4, field.y - 6, field.width + 8, 6);
      ctx.fillRect(field.x - 4, GROUND - 5, field.width + 8, 5);
      if (field.active) {
        ctx.fillStyle = "#ffca9277"; ctx.fillRect(field.x, field.y, field.width, field.height);
        ctx.fillStyle = "#ffefd2"; ctx.fillRect(field.x + 10, field.y, 4, field.height);
      }
      ctx.fillStyle = "#17263c"; ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
      ctx.fillText(field.active ? "ZAP" : "OFF", field.x + field.width / 2, field.y - 12);
    });
    ctx.fillStyle = "#fff1bd"; ctx.fillRect(trail.checkpointX + 12, GROUND - 75, 4, 75);
    ctx.fillStyle = trail.saved.half ? "#78e3bd" : "#ffe2a0";
    ctx.fillRect(trail.checkpointX + 16, GROUND - 75, 36, 20);
    ctx.fillStyle = "#17263c"; ctx.font = "bold 10px monospace"; ctx.textAlign = "left";
    ctx.fillText("SAVE", trail.checkpointX + 18, GROUND - 60);
    ctx.fillStyle = "#17263ce8"; ctx.fillRect(trail.end - 55, GROUND - 65, 110, 24);
    ctx.fillStyle = "#b6f0d4"; ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
    ctx.fillText("NEXT QUIZ >", trail.end, GROUND - 49);
  }

  drawPlayer(time) {
    const { ctx, player: p } = this;
    const moving = !this.paused && (this.keys.left || this.keys.right) && p.grounded;
    const stride = moving ? Math.sin(p.walk) * 4 : 0;
    const x = Math.round(p.x), y = Math.round(p.y);
    ctx.globalAlpha = this.trail?.invulnerable > 0 ? 0.65 : 1;
    ctx.fillStyle = "#0003"; ctx.fillRect(x - 2, GROUND - 4, 32, 5);
    ctx.fillStyle = "#213851"; ctx.fillRect(x + 3, y + 32, 8, 9 + stride);
    ctx.fillRect(x + 17, y + 32, 8, 9 - stride);
    ctx.fillStyle = "#fff1bd"; ctx.fillRect(x, y + 40 + stride, 12, 4);
    ctx.fillRect(x + 16, y + 40 - stride, 12, 4);
    ctx.fillStyle = "#cf7c60"; ctx.fillRect(x + 2, y + 17, 24, 19);
    ctx.fillStyle = "#f2b578"; ctx.fillRect(x + 8, y + 20, 12, 16);
    ctx.fillStyle = "#77c9bb"; ctx.fillRect(x - (p.facing > 0 ? 3 : -22), y + 20, 9, 12);
    ctx.fillStyle = "#f7d9ae"; ctx.fillRect(x + 5, y + 5, 20, 14);
    ctx.fillRect(x + (p.facing > 0 ? 24 : 1), y + 11, 4, 6);
    ctx.fillStyle = "#243b50"; ctx.fillRect(x + (p.facing > 0 ? 20 : 7), y + 9, 3, 4);
    ctx.fillStyle = "#3c7084"; ctx.fillRect(x + 4, y, 23, 7);
    ctx.fillRect(x + (p.facing > 0 ? 20 : -1), y + 4, 12, 4);
    if (this.trail) {
      ctx.fillStyle = "#76e2ea"; ctx.fillRect(x + (p.facing > 0 ? 23 : -8), y + 20, 13, 7);
      ctx.fillStyle = "#213851"; ctx.fillRect(x + (p.facing > 0 ? 24 : -4), y + 27, 5, 5);
    }
    if (this.campaign.completed === CHALLENGES.length) {
      star(ctx, x + 14, y - 15 + Math.sin(time * 2) * 2, 8, "#ffe69b");
    }
    ctx.globalAlpha = 1;
  }
}
