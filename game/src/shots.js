// Emberleap — the deterministic screenshot scenes behind ?shot=start|play|end.
// Each scene plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot, so the frame is what a
// real game looks like and the same seed always gives the same frame.
import { startGame, stepWorld, EVENT_LEVEL_CLEAR, EVENT_GAME_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const STEP = 1 / 60;
const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;

// The autopilot input the world reads each step.
function blankInput() {
  return { left: false, right: false, jumpHeld: false, jumpPressed: false };
}

// Is there ground under the point (x, feetY + drop) to land on?
function groundAhead(world, x, feetY, drop) {
  for (const plat of world.level.platforms) {
    if (x >= plat.x - 6 && x <= plat.x + plat.w + 6 && plat.y >= feetY - 8 && plat.y <= feetY + drop) {
      return plat;
    }
  }
  return null;
}

// The good pilot: always runs right, jumps for gaps, higher ledges and motes
// above, hops late over wisps, and saves the double jump for when it is
// falling short of a ledge just ahead. Ground jumps fire only on the ground
// (or in coyote time); air jumps fire only through the double-jump branch,
// so the pilot never wastes its second jump on a wisp scare.
function goodPilot(world, prev) {
  const input = blankInput();
  const p = world.player;
  input.right = true;
  const feetY = p.y + p.h;
  const aheadX = p.x + p.w + 46;
  const centreY = p.y + p.h / 2;
  // If a wisp is hovering in the jump arc just ahead, wait on the ground
  // until it drifts away instead of leaping straight into it.
  if (p.onGround) {
    for (const w of world.level.wisps) {
      const wx = w.x + Math.sin(w.phase * 0.02) * w.range;
      const wy = w.y + Math.cos(w.phase * 0.013) * 26;
      if (wx > p.x && wx - p.x < 220 && Math.abs(wy - centreY) < 70) {
        input.right = false;
        return input;
      }
    }
  }
  let wantJump = false;
  if (p.onGround) {
    if (!groundAhead(world, aheadX, feetY, 70)) wantJump = true;
    const ledge = groundAhead(world, aheadX, feetY, 200);
    if (ledge && ledge.y < feetY - 30) wantJump = true;
    for (const m of world.level.motes) {
      if (!m.taken && m.y < p.y - 30 && Math.abs(m.x - (p.x + p.w / 2)) < 50) wantJump = true;
    }
    // A wisp very close ahead at our height: hop over it, late.
    for (const w of world.level.wisps) {
      const wx = w.x + Math.sin(w.phase * 0.02) * w.range;
      if (wx > p.x && wx - p.x < 85 && Math.abs(w.y - centreY) < 60) wantJump = true;
    }
  }
  // Double jump only when falling, below a ledge just ahead, and close to it.
  let doubleJump = false;
  if (!p.onGround && p.jumps === 1 && p.vy > 100) {
    for (const plat of world.level.platforms) {
      const gap = plat.x - (p.x + p.w);
      if (gap > -10 && gap < 150 && plat.y < feetY - 40 && plat.y > feetY - 320) {
        doubleJump = true;
      }
    }
  }
  // Hold the button briefly after each press so the jump reaches full height
  // (releasing early cuts the rise), but never hold it while falling: on
  // landing the button must be free again for the next fresh press.
  const holdLeft = prev.holdLeft || 0;
  const canGroundJump = p.onGround || p.coyote > 0;
  const hold = (wantJump && p.onGround) || holdLeft > 0 || doubleJump;
  input.jumpHeld = hold;
  input.jumpPressed = (wantJump && canGroundJump && !prev.jumpHeld) || doubleJump;
  input.holdLeft = input.jumpPressed ? 14 : Math.max(0, holdLeft - 1);
  return input;
}

// The hurried pilot: only jumps at the last moment, never double-jumps, and
// never dodges wisps — so it is caught out, as a rushed player is.
function hurriedPilot(world, prev) {
  const input = blankInput();
  const p = world.player;
  input.right = true;
  const feetY = p.y + p.h;
  const holdLeft = prev.holdLeft || 0;
  const wantJump = p.onGround && !groundAhead(world, p.x + p.w + 22, feetY, 70);
  input.jumpHeld = wantJump || holdLeft > 0;
  input.jumpPressed = wantJump && !prev.jumpHeld;
  input.holdLeft = input.jumpPressed ? 10 : Math.max(0, holdLeft - 1);
  return input;
}

/**
 * Set `world` to the named scene (start, play or end; any other name is
 * start) and return the screen to draw, the best score to show and the
 * clock time for the backdrop animation.
 */
export function stageShot(name, world, seed) {
  startGame(world);
  if (name !== 'play' && name !== 'end') {
    const input = blankInput();
    for (let i = 0; i < START_SECONDS / STEP; i += 1) stepWorld(world, STEP, input);
    return { screen: SCREEN_TITLE, best: 2450, time: 5 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const pilot = name === 'end' ? hurriedPilot : goodPilot;
  let prev = blankInput();
  let simTime = 0;
  for (let i = 0; i < limit / STEP; i += 1) {
    const input = pilot(world, prev);
    prev = input;
    const event = stepWorld(world, STEP, input);
    simTime += STEP;
    if (event & EVENT_GAME_OVER) break;
    if (event & EVENT_LEVEL_CLEAR) break; // level clear: stop on the clear frame
  }
  const over = world.lives === 0;
  return {
    screen: over ? SCREEN_OVER : SCREEN_PLAY,
    best: Math.max(2450, world.score),
    time: simTime,
  };
}
