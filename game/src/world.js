// Emberleap — the world: player physics, coyote time, double jump, jump
// buffering, platform collision, mote pickup, wisp hits, falling into the
// void, and reaching the lantern gate. Fixed-step friendly: step(dt, input).
import { buildLevel, LEVEL_COUNT } from './levels.js';
import { spawnBurst, spawnTrail } from './particles.js';
import { playJump, playPickup, playHurt, playGate } from './audio.js';

export const GRAVITY = 2200;
export const MOVE_SPEED = 340;
export const JUMP_VEL = -800;
export const DOUBLE_JUMP_VEL = -720;
export const COYOTE_TIME = 0.12;
export const JUMP_BUFFER = 0.12;
export const FALL_LIMIT = 760; // below this y the firefly is lost to the void
export const EVENT_NONE = 0;
export const EVENT_LEVEL_CLEAR = 1;
export const EVENT_GAME_OVER = 2;
export const EVENT_HURT = 4;

export function makeWorld(audio, particles) {
  return {
    audio, particles,
    levelIndex: 0, level: null, totalMotes: 0, motesGot: 0,
    score: 0, lives: 3, combo: 0, time: 0, levelTime: 0,
    player: null, camX: 0, shake: 0, flash: 0,
    invulnerable: 0, levelClear: false, clearTimer: 0,
  };
}

function freshPlayer(spawn) {
  return {
    x: spawn.x, y: spawn.y, w: 30, h: 34,
    vx: 0, vy: 0, onGround: false, coyote: 0, buffer: 0,
    jumps: 0, facing: 1, squash: 0, trailTimer: 0,
  };
}

export function loadLevel(world, index) {
  world.levelIndex = index;
  world.level = buildLevel(index);
  world.player = freshPlayer(world.level.spawn);
  world.totalMotes = world.level.motes.length;
  world.motesGot = 0;
  world.combo = 0;
  world.levelTime = 0;
  world.camX = 0;
  world.levelClear = false;
  world.clearTimer = 0;
  world.invulnerable = 0;
}

export function startGame(world) {
  world.score = 0;
  world.lives = 3;
  world.time = 0;
  loadLevel(world, 0);
}

function hurtPlayer(world) {
  const p = world.player;
  world.lives -= 1;
  world.combo = 0;
  world.invulnerable = 1.6;
  world.shake = 0.35;
  world.flash = 0.25;
  playHurt(world.audio);
  spawnBurst(world.particles, p.x + p.w / 2, p.y + p.h / 2, '#b78cff', 22, 260, 0.6, 5, 300);
  if (world.lives <= 0) return EVENT_GAME_OVER;
  // Respawn at the level start, keeping collected motes.
  world.player = freshPlayer(world.level.spawn);
  world.camX = 0;
  return EVENT_HURT;
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function stepWorld(world, dt, input) {
  const level = world.level;
  const p = world.player;
  if (world.levelClear) {
    world.clearTimer -= dt;
    return world.clearTimer <= 0 ? EVENT_LEVEL_CLEAR : EVENT_NONE;
  }
  world.time += dt;
  world.levelTime += dt;
  if (world.invulnerable > 0) world.invulnerable -= dt;
  if (world.shake > 0) world.shake -= dt;
  if (world.flash > 0) world.flash -= dt;

  // Moving platforms drift along their axis.
  for (const plat of level.platforms) {
    if (plat.kind !== 'mover') continue;
    plat.phase += dt * plat.speed;
    const off = Math.sin(plat.phase * 0.02) * plat.range;
    if (plat.axis === 'x') plat.x = plat.baseX + off;
    else plat.y = plat.baseY + off;
  }

  // Horizontal movement.
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  p.vx = dir * MOVE_SPEED;
  if (dir !== 0) p.facing = dir;

  // Jump: buffered press + coyote time, then a double jump in the air.
  if (input.jumpPressed) p.buffer = JUMP_BUFFER;
  else p.buffer -= dt;
  if (p.onGround) { p.coyote = COYOTE_TIME; p.jumps = 0; }
  else p.coyote -= dt;
  if (p.buffer > 0) {
    if (p.coyote > 0) {
      p.vy = JUMP_VEL; p.onGround = false; p.coyote = 0; p.buffer = 0;
      p.jumps = 1; p.squash = 0.18;
      playJump(world.audio, false);
      spawnBurst(world.particles, p.x + p.w / 2, p.y + p.h, '#ffd76a', 8, 120, 0.35, 3, 100);
    } else if (p.jumps < 2) {
      p.vy = DOUBLE_JUMP_VEL; p.buffer = 0; p.jumps = 2; p.squash = 0.18;
      playJump(world.audio, true);
      spawnBurst(world.particles, p.x + p.w / 2, p.y + p.h, '#7fe3ff', 12, 160, 0.4, 3, 100);
    }
  }
  // Variable jump height: releasing jump early cuts the rise.
  if (!input.jumpHeld && p.vy < -260) p.vy += GRAVITY * dt * 1.6;

  p.vy += GRAVITY * dt;
  if (p.vy > 1100) p.vy = 1100;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = Math.max(0, Math.min(level.width - p.w, p.x));
  if (p.squash > 0) p.squash -= dt;

  // Land on platforms (only from above, while falling).
  const wasGround = p.onGround;
  p.onGround = false;
  for (const plat of level.platforms) {
    if (p.vy >= 0 && p.x + p.w > plat.x + 4 && p.x < plat.x + plat.w - 4) {
      const prevBottom = p.y + p.h - p.vy * dt;
      if (prevBottom <= plat.y + 6 && p.y + p.h >= plat.y && p.y + p.h <= plat.y + plat.h + 18) {
        p.y = plat.y - p.h;
        p.vy = 0;
        p.onGround = true;
        if (!wasGround) {
          p.squash = 0.14;
          spawnBurst(world.particles, p.x + p.w / 2, p.y + p.h, '#ffb347', 6, 90, 0.3, 3, 120);
        }
      }
    }
  }

  // Firefly trail while moving through the air.
  p.trailTimer -= dt;
  if (p.trailTimer <= 0) {
    p.trailTimer = 0.05;
    spawnTrail(world.particles, p.x + p.w / 2, p.y + p.h / 2);
  }

  // Collect motes.
  for (const m of level.motes) {
    if (m.taken) continue;
    if (Math.abs(m.x - (p.x + p.w / 2)) < 34 && Math.abs(m.y - (p.y + p.h / 2)) < 38) {
      m.taken = true;
      world.motesGot += 1;
      world.combo += 1;
      const gain = 100 + Math.min(world.combo - 1, 8) * 25;
      world.score += gain;
      playPickup(world.audio, world.combo);
      spawnBurst(world.particles, m.x, m.y, '#ffe98a', 14, 200, 0.5, 4, 60);
    }
  }

  // Void wisps drift and hurt on touch (unless briefly invulnerable).
  for (const w of level.wisps) {
    w.phase += dt * w.speed;
    const wx = w.x + Math.sin(w.phase * 0.02) * w.range;
    const wy = w.y + Math.cos(w.phase * 0.013) * 26;
    if (world.invulnerable <= 0) {
      const dx = wx - (p.x + p.w / 2);
      const dy = wy - (p.y + p.h / 2);
      if (dx * dx + dy * dy < 34 * 34) {
        const event = hurtPlayer(world);
        if (event === EVENT_GAME_OVER) return event;
        return EVENT_HURT;
      }
    }
  }

  // Fell into the void.
  if (p.y > FALL_LIMIT) {
    const event = hurtPlayer(world);
    if (event === EVENT_GAME_OVER) return event;
    return EVENT_HURT;
  }

  // Reached the lantern gate: level clear, time bonus for beating par.
  // The trigger is generous on purpose — leaping over the lantern still counts.
  const gate = level.gate;
  if (Math.abs(gate.x - (p.x + p.w / 2)) < 60 && Math.abs(gate.y + 30 - (p.y + p.h / 2)) < 120) {
    const timeBonus = Math.max(0, Math.round((level.par - world.levelTime) * 10));
    const moteBonus = world.motesGot * 50;
    world.score += timeBonus + moteBonus;
    world.levelClear = true;
    world.clearTimer = 1.6;
    playGate(world.audio);
    spawnBurst(world.particles, gate.x, gate.y, '#ffe98a', 40, 320, 0.9, 5, 80);
    spawnBurst(world.particles, gate.x, gate.y + 40, '#ff9d4d', 30, 260, 0.8, 5, 80);
    return EVENT_NONE;
  }

  // Camera follows the player, clamped to the level.
  const target = Math.max(0, Math.min(level.width - 1280, p.x + p.w / 2 - 480));
  world.camX += (target - world.camX) * Math.min(1, dt * 6);
  return EVENT_NONE;
}

export function isLastLevel(world) {
  return world.levelIndex >= LEVEL_COUNT - 1;
}
