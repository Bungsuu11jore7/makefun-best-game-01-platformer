// Emberleap — all drawing: parallax night sky, ember islands, the firefly
// hero, motes, wisps, the lantern gate, particles, HUD and menu screens.
// Everything is drawn with canvas primitives; there are no image assets.
import { drawParticles } from './particles.js';
import { LEVEL_NAMES } from './levels.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';
export const SCREEN_HOW = 'how';

const VIEW_W = 1280;
const VIEW_H = 720;

// Stars and distant embers, placed once from a fixed seed so the backdrop
// never flickers between frames.
export function makeBackdrop(seed) {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({ x: rnd() * VIEW_W, y: rnd() * 420, r: 0.6 + rnd() * 1.8, tw: rnd() * 6.28 });
  }
  const hills = [];
  for (let i = 0; i < 9; i += 1) {
    hills.push({ x: i * 180 + rnd() * 60, h: 90 + rnd() * 130, w: 200 + rnd() * 160 });
  }
  return { stars, hills };
}

function drawSky(ctx, backdrop, camX, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#160b2e');
  grad.addColorStop(0.55, '#2b1145');
  grad.addColorStop(1, '#4a1c3d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Moon.
  ctx.fillStyle = '#ffeec4';
  ctx.beginPath(); ctx.arc(1080 - (camX * 0.05) % 200, 96, 44, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f5d98e';
  ctx.beginPath(); ctx.arc(1066 - (camX * 0.05) % 200, 86, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1096 - (camX * 0.05) % 200, 108, 6, 0, Math.PI * 2); ctx.fill();
  // Stars, twinkling.
  for (const s of backdrop.stars) {
    const sx = ((s.x - camX * 0.12) % VIEW_W + VIEW_W) % VIEW_W;
    ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(time * 1.4 + s.tw));
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath(); ctx.arc(sx, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Far silhouetted hills.
  ctx.fillStyle = '#1d0f33';
  for (const h of backdrop.hills) {
    const hx = ((h.x - camX * 0.25) % (VIEW_W + 240) + VIEW_W + 240) % (VIEW_W + 240) - 120;
    ctx.beginPath();
    ctx.moveTo(hx, VIEW_H);
    ctx.quadraticCurveTo(hx + h.w / 2, VIEW_H - h.h, hx + h.w, VIEW_H);
    ctx.fill();
  }
  // Near dark ridge.
  ctx.fillStyle = '#140a26';
  ctx.beginPath();
  ctx.moveTo(0, VIEW_H);
  for (let x = 0; x <= VIEW_W; x += 80) {
    ctx.lineTo(x, VIEW_H - 40 - Math.sin((x + camX * 0.5) * 0.006) * 26);
  }
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.fill();
}

function drawPlatform(ctx, plat, time) {
  const x = plat.x, y = plat.y;
  ctx.fillStyle = '#3a2a55';
  ctx.beginPath();
  ctx.roundRect(x, y, plat.w, plat.h, 12);
  ctx.fill();
  // Glowing ember top.
  const glow = ctx.createLinearGradient(x, y, x, y + 10);
  glow.addColorStop(0, '#ffb347');
  glow.addColorStop(1, '#ff7a2f');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.roundRect(x, y, plat.w, 9, [12, 12, 0, 0]);
  ctx.fill();
  // Under-glow embers.
  ctx.fillStyle = 'rgba(255,122,47,0.55)';
  const n = Math.floor(plat.w / 34);
  for (let i = 0; i < n; i += 1) {
    const ex = x + 14 + i * 34;
    const flick = 2 + Math.sin(time * 3 + i * 1.7 + x) * 1.2;
    ctx.beginPath(); ctx.arc(ex, y + plat.h - 5, flick, 0, Math.PI * 2); ctx.fill();
  }
  if (plat.kind === 'mover') {
    ctx.fillStyle = '#7fe3ff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('~ moving ~', x + plat.w / 2, y + plat.h + 16);
  }
}

function drawMote(ctx, m, time) {
  const bob = Math.sin(time * 2.4 + m.x * 0.05) * 5;
  const pulse = 0.75 + Math.sin(time * 4 + m.x) * 0.25;
  ctx.save();
  ctx.translate(m.x, m.y + bob);
  ctx.globalAlpha = 0.35 * pulse;
  ctx.fillStyle = '#ffe98a';
  ctx.beginPath(); ctx.arc(0, 0, 20 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffe98a';
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffbe0';
  ctx.beginPath(); ctx.arc(-2, -2, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawWisp(ctx, w, time) {
  const wx = w.x + Math.sin(w.phase * 0.02) * w.range;
  const wy = w.y + Math.cos(w.phase * 0.013) * 26;
  ctx.save();
  ctx.translate(wx, wy);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#8b5cf6';
  ctx.beginPath(); ctx.arc(0, 0, 30 + Math.sin(time * 5) * 3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#c4b5fd';
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a1650';
  ctx.beginPath(); ctx.arc(-5, -3, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, -3, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a1650';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 5, 6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.restore();
}

function drawGate(ctx, gate, time) {
  const flick = 0.8 + Math.sin(time * 6) * 0.2;
  ctx.save();
  ctx.translate(gate.x, gate.y);
  ctx.globalAlpha = 0.3 * flick;
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath(); ctx.arc(0, 30, 90, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // Lantern post and hanging lantern.
  ctx.fillStyle = '#5b3a1e';
  ctx.fillRect(-4, -70, 8, 110);
  ctx.fillRect(-4, -70, 60, 8);
  ctx.strokeStyle = '#2a1a0e';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(52, -62); ctx.lineTo(52, -34); ctx.stroke();
  ctx.fillStyle = '#ff9d4d';
  ctx.beginPath(); ctx.roundRect(34, -34, 36, 52, 8); ctx.fill();
  ctx.fillStyle = '#ffe98a';
  ctx.beginPath(); ctx.roundRect(40, -26, 24, 36, 6); ctx.fill();
  ctx.fillStyle = '#5b3a1e';
  ctx.fillRect(30, -42, 44, 9);
  ctx.fillRect(30, 18, 44, 9);
  // Banner.
  ctx.fillStyle = '#ffe98a';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GATE', 0, 64);
  ctx.restore();
}

function drawPlayer(ctx, p, time, invulnerable) {
  if (invulnerable > 0 && Math.floor(time * 12) % 2 === 0) return; // hurt blink
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const squash = p.squash > 0 ? 1 + p.squash * 1.4 : 1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(2 - squash > 1.4 ? 1.4 : 2 - squash, squash);
  // Glow.
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath(); ctx.arc(0, 0, 30 + Math.sin(time * 5) * 3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // Body: a little firefly spirit.
  ctx.fillStyle = '#ffcf3f';
  ctx.beginPath(); ctx.ellipse(0, 2, 14, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff9d4d';
  ctx.beginPath(); ctx.ellipse(0, 8, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Wings.
  ctx.fillStyle = 'rgba(200,240,255,0.75)';
  const flap = Math.sin(time * (p.onGround ? 6 : 22)) * 6;
  ctx.beginPath(); ctx.ellipse(-12, -8 - flap, 10, 5, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, -8 - flap, 10, 5, 0.6, 0, Math.PI * 2); ctx.fill();
  // Eyes look where the firefly faces.
  ctx.fillStyle = '#241505';
  ctx.beginPath(); ctx.arc(3 * p.facing, -2, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(9 * p.facing, -2, 2.6, 0, Math.PI * 2); ctx.fill();
  // Antennae.
  ctx.strokeStyle = '#ffcf3f';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-4, -10); ctx.quadraticCurveTo(-8, -18, -12, -20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -10); ctx.quadraticCurveTo(8, -18, 12, -20); ctx.stroke();
  ctx.restore();
}

export function drawWorld(ctx, world, backdrop, time) {
  const camX = world.camX + (world.shake > 0 ? (Math.random() - 0.5) * 12 : 0);
  ctx.save();
  drawSky(ctx, backdrop, camX, time);
  ctx.translate(-camX, 0);
  for (const plat of world.level.platforms) drawPlatform(ctx, plat, time);
  for (const m of world.level.motes) if (!m.taken) drawMote(ctx, m, time);
  for (const w of world.level.wisps) drawWisp(ctx, w, time);
  drawGate(ctx, world.level.gate, time);
  drawParticles(ctx, world.particles, camX);
  drawPlayer(ctx, world.player, time, world.invulnerable);
  ctx.restore();
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(180,80,255,${world.flash * 1.6})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

function fmtTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(1, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function drawHud(ctx, world) {
  ctx.save();
  // Top bar.
  ctx.fillStyle = 'rgba(10,6,22,0.62)';
  ctx.beginPath(); ctx.roundRect(0, 0, VIEW_W, 52, [0, 0, 14, 14]); ctx.fill();
  ctx.fillStyle = '#ffe98a';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`EMBERLEAP  ·  Level ${world.levelIndex + 1} — ${world.level.name}`, 18, 33);
  ctx.textAlign = 'right';
  ctx.fillText(`✦ ${world.motesGot}/${world.totalMotes}`, 640, 33);
  ctx.fillText(`Score ${world.score}`, 820, 33);
  ctx.fillText(`⏱ ${fmtTime(world.levelTime)}`, 980, 33);
  // Lives as hearts.
  ctx.textAlign = 'left';
  let hearts = '';
  for (let i = 0; i < 3; i += 1) hearts += i < world.lives ? '♥ ' : '♡ ';
  ctx.fillStyle = '#ff6b81';
  ctx.fillText(hearts, 1080, 33);
  // Progress bar toward the gate.
  const prog = Math.max(0, Math.min(1, world.player.x / world.level.width));
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.roundRect(18, 60, 220, 8, 4); ctx.fill();
  ctx.fillStyle = '#ffb347';
  ctx.beginPath(); ctx.roundRect(18, 60, 220 * prog, 8, 4); ctx.fill();
  ctx.fillStyle = '#ffe98a';
  ctx.font = '13px sans-serif';
  ctx.fillText('→ lantern gate', 248, 68);
  // Combo toast.
  if (world.combo >= 3) {
    ctx.fillStyle = '#7fe3ff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`COMBO x${world.combo}`, VIEW_W - 18, 88);
  }
  ctx.restore();
}

export function drawButton(ctx, x, y, w, h, label, hover) {
  ctx.save();
  ctx.fillStyle = hover ? '#ffb347' : '#ff8a2f';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();
  ctx.strokeStyle = '#ffe98a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#241505';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

export function buttonHit(input, x, y, w, h) {
  return input.mouseX >= x && input.mouseX <= x + w && input.mouseY >= y && input.mouseY <= y + h;
}

function dim(ctx, alpha = 0.55) {
  ctx.fillStyle = `rgba(8,4,20,${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function centerText(ctx, text, y, size, color, bold = true) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, VIEW_W / 2, y);
}

export function drawTitle(ctx, backdrop, time, best) {
  drawSky(ctx, backdrop, time * 12, time);
  // A few decorative motes drifting on the title screen.
  for (let i = 0; i < 7; i += 1) {
    const mx = 200 + i * 140 + Math.sin(time + i * 1.3) * 30;
    const my = 300 + Math.cos(time * 0.8 + i) * 40;
    ctx.globalAlpha = 0.5 + Math.sin(time * 3 + i) * 0.3;
    ctx.fillStyle = '#ffe98a';
    ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  centerText(ctx, '✦  EMBERLEAP  ✦', 150, 64, '#ffe98a');
  centerText(ctx, 'A firefly spirit leaps across the ember islands', 215, 24, '#fff6d8', false);
  centerText(ctx, 'Collect light motes. Dodge the void wisps.', 252, 24, '#fff6d8', false);
  centerText(ctx, 'Reach the lantern gate at the end of each level.', 289, 24, '#fff6d8', false);
  centerText(ctx, '3 levels  ·  double jump  ·  coyote time  ·  combo scoring', 340, 19, '#7fe3ff', false);
  centerText(ctx, '← → / A D move      SPACE / W / ↑ jump (twice!)      M mute', 400, 19, '#c4b5fd', false);
  if (best > 0) centerText(ctx, `Best score: ${best}`, 448, 20, '#ffe98a', false);
  drawButton(ctx, VIEW_W / 2 - 130, 500, 260, 58, '▶  PLAY', false);
  drawButton(ctx, VIEW_W / 2 - 130, 575, 260, 48, 'HOW TO PLAY', false);
  centerText(ctx, 'Click PLAY or press any key', 660, 16, '#8b7bb8', false);
}

export function drawHow(ctx) {
  dim(ctx, 0.72);
  centerText(ctx, 'HOW TO PLAY', 110, 40, '#ffe98a');
  const lines = [
    'Goal: reach the lantern gate at the far right of each level.',
    'Collect light motes — each is worth 100 points, chained pickups build a combo.',
    'Void wisps and the void below cost one life. You have 3 lives.',
    'Jump: SPACE / W / ↑. Jump again mid-air for a double jump.',
    'Coyote time: you can still jump for a split second after leaving a ledge.',
    'Beat the par time for a bonus. Clear all 3 levels to win!',
    'Moving platforms drift — ride them across the wide gaps.',
    'Press M to mute the music and sounds. Click the buttons or press a key.',
  ];
  lines.forEach((line, i) => centerText(ctx, line, 175 + i * 42, 20, '#fff6d8', false));
  drawButton(ctx, VIEW_W / 2 - 110, 560, 220, 52, '←  BACK', false);
}

export function drawClear(ctx, world) {
  dim(ctx, 0.5);
  centerText(ctx, 'LEVEL CLEAR!', 200, 52, '#ffe98a');
  centerText(ctx, `${world.level.name} complete`, 270, 26, '#fff6d8', false);
  centerText(ctx, `Motes  ${world.motesGot} / ${world.totalMotes}      Score  ${world.score}`, 330, 24, '#7fe3ff', false);
  centerText(ctx, `Time  ${fmtTime(world.levelTime)}   (par ${fmtTime(world.level.par)})`, 375, 22, '#c4b5fd', false);
  centerText(ctx, 'Next level loading…', 450, 20, '#8b7bb8', false);
}

export function drawOver(ctx, world, best) {
  dim(ctx, 0.6);
  centerText(ctx, 'THE LIGHT FADES…', 180, 52, '#c4b5fd');
  centerText(ctx, 'Your firefly fell to the void wisps.', 250, 24, '#fff6d8', false);
  centerText(ctx, `Score  ${world.score}      Best  ${Math.max(best, world.score)}`, 310, 26, '#ffe98a');
  centerText(ctx, `You reached Level ${world.levelIndex + 1} — ${world.level.name}`, 355, 20, '#7fe3ff', false);
  drawButton(ctx, VIEW_W / 2 - 130, 430, 260, 58, '↻  TRY AGAIN', false);
  drawButton(ctx, VIEW_W / 2 - 130, 505, 260, 48, 'TITLE SCREEN', false);
  centerText(ctx, 'or press any key to retry', 590, 16, '#8b7bb8', false);
}

export function drawWin(ctx, world, best) {
  dim(ctx, 0.55);
  centerText(ctx, '★  ALL LANTERNS LIT!  ★', 160, 52, '#ffe98a');
  centerText(ctx, 'You guided the firefly through all three ember isles.', 230, 24, '#fff6d8', false);
  centerText(ctx, `Final score  ${world.score}      Best  ${Math.max(best, world.score)}`, 295, 28, '#7fe3ff');
  centerText(ctx, `Motes collected  ${world.motesGot} / ${world.totalMotes}   ·   Time  ${fmtTime(world.time)}`, 345, 20, '#c4b5fd', false);
  centerText(ctx, 'The night is bright again — thank you for playing!', 395, 20, '#fff6d8', false);
  drawButton(ctx, VIEW_W / 2 - 130, 450, 260, 58, '↻  PLAY AGAIN', false);
  drawButton(ctx, VIEW_W / 2 - 130, 525, 260, 48, 'TITLE SCREEN', false);
  centerText(ctx, 'or press any key to play again', 610, 16, '#8b7bb8', false);
}
