// Emberleap — bootstrap and game loop: fixed-step simulation, screen state
// machine (title / how / play / clear / over / win), HUD, menus by mouse,
// and the deterministic ?shot= scenes used for screenshots.
import { makeAudio, unlockAudio, startMusic, toggleMute, playClick, playWin, playLose } from './audio.js';
import { makeInput, attachInput, endFrameInput } from './input.js';
import { makeParticles, updateParticles } from './particles.js';
import { makeWorld, startGame, loadLevel, stepWorld, isLastLevel, EVENT_LEVEL_CLEAR, EVENT_GAME_OVER, EVENT_HURT } from './world.js';
import { makeBackdrop, drawWorld, drawHud, drawTitle, drawHow, drawClear, drawOver, drawWin, drawButton, buttonHit, SCREEN_TITLE, SCREEN_PLAY, SCREEN_CLEAR, SCREEN_OVER, SCREEN_WIN, SCREEN_HOW } from './render.js';
import { stageShot } from './shots.js';

const VIEW_W = 1280;
const VIEW_H = 720;
const STEP = 1 / 60;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const audio = makeAudio();
const input = makeInput();
const particles = makeParticles();
const world = makeWorld(audio, particles);
const backdrop = makeBackdrop(20261116);

let screen = SCREEN_TITLE;
let best = 0;
try { best = Number(localStorage.getItem('emberleap-best') || 0) || 0; } catch { best = 0; }
let time = 0;
let accumulator = 0;
let lastNow = performance.now();
let shotMode = null;

function saveBest() {
  if (world.score > best) {
    best = world.score;
    try { localStorage.setItem('emberleap-best', String(best)); } catch { /* private mode */ }
  }
}

function setStatus(text) { statusEl.textContent = text; }

function startPlaying() {
  unlockAudio(audio);
  startMusic(audio);
  playClick(audio);
  startGame(world);
  screen = SCREEN_PLAY;
  setStatus(`Playing level 1, ${world.level.name}. Collect motes and reach the lantern gate.`);
}

function goTitle() {
  playClick(audio);
  screen = SCREEN_TITLE;
  setStatus('Emberleap title screen.');
}

// Buttons are laid out in render.js; these are their hit boxes.
const BTN = {
  play: { x: VIEW_W / 2 - 130, y: 500, w: 260, h: 58 },
  how: { x: VIEW_W / 2 - 130, y: 575, w: 260, h: 48 },
  back: { x: VIEW_W / 2 - 110, y: 560, w: 220, h: 52 },
  retry: { x: VIEW_W / 2 - 130, y: 430, w: 260, h: 58 },
  title: { x: VIEW_W / 2 - 130, y: 505, w: 260, h: 48 },
  again: { x: VIEW_W / 2 - 130, y: 450, w: 260, h: 58 },
  winTitle: { x: VIEW_W / 2 - 130, y: 525, w: 260, h: 48 },
};

function handleMenus() {
  const clicked = input.mouseClicked;
  const key = input.anyPressed && !clicked;
  if (screen === SCREEN_TITLE) {
    if ((clicked && buttonHit(input, BTN.play.x, BTN.play.y, BTN.play.w, BTN.play.h)) || key) {
      startPlaying();
    } else if (clicked && buttonHit(input, BTN.how.x, BTN.how.y, BTN.how.w, BTN.how.h)) {
      playClick(audio); screen = SCREEN_HOW;
    }
  } else if (screen === SCREEN_HOW) {
    if ((clicked && buttonHit(input, BTN.back.x, BTN.back.y, BTN.back.w, BTN.back.h)) || key) goTitle();
  } else if (screen === SCREEN_OVER) {
    if ((clicked && buttonHit(input, BTN.retry.x, BTN.retry.y, BTN.retry.w, BTN.retry.h)) || key) startPlaying();
    else if (clicked && buttonHit(input, BTN.title.x, BTN.title.y, BTN.title.w, BTN.title.h)) goTitle();
  } else if (screen === SCREEN_WIN) {
    if ((clicked && buttonHit(input, BTN.again.x, BTN.again.y, BTN.again.w, BTN.again.h)) || key) startPlaying();
    else if (clicked && buttonHit(input, BTN.winTitle.x, BTN.winTitle.y, BTN.winTitle.w, BTN.winTitle.h)) goTitle();
  }
}

function onEvent(event) {
  if (event & EVENT_LEVEL_CLEAR) {
    if (isLastLevel(world)) {
      saveBest();
      playWin(audio);
      screen = SCREEN_WIN;
      setStatus(`You won! Final score ${world.score}.`);
    } else {
      loadLevel(world, world.levelIndex + 1);
      screen = SCREEN_PLAY;
      setStatus(`Level ${world.levelIndex + 1}, ${world.level.name}.`);
    }
  } else if (event & EVENT_GAME_OVER) {
    saveBest();
    playLose(audio);
    screen = SCREEN_OVER;
    setStatus(`Game over. Score ${world.score}.`);
  } else if (event & EVENT_HURT) {
    setStatus(`Ouch! ${world.lives} ${world.lives === 1 ? 'life' : 'lives'} left.`);
  }
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / VIEW_H, 0, 0);
}
window.addEventListener('resize', resize);
resize();

attachInput(input, canvas, (kind) => {
  if (kind === 'mute') {
    const muted = toggleMute(audio);
    setStatus(muted ? 'Sound muted.' : 'Sound on.');
  } else {
    unlockAudio(audio);
  }
});

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min(0.1, (now - lastNow) / 1000);
  lastNow = now;
  time += elapsed;

  if (shotMode) {
    // Screenshot mode: the scene was staged once; just draw it.
    drawScene();
    endFrameInput(input);
    return;
  }

  if (screen === SCREEN_PLAY) {
    accumulator += elapsed;
    let guard = 0;
    while (accumulator >= STEP && guard < 5) {
      accumulator -= STEP;
      guard += 1;
      const event = stepWorld(world, STEP, input);
      updateParticles(particles, STEP);
      if (event !== 0) onEvent(event);
      if (screen !== SCREEN_PLAY) { accumulator = 0; break; }
    }
  } else {
    updateParticles(particles, elapsed);
    handleMenus();
  }
  drawScene();
  endFrameInput(input);
}

function drawScene() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (screen === SCREEN_TITLE) {
    drawTitle(ctx, backdrop, time, best);
  } else if (screen === SCREEN_HOW) {
    drawWorld(ctx, world, backdrop, time);
    drawHow(ctx);
  } else if (screen === SCREEN_PLAY) {
    drawWorld(ctx, world, backdrop, time);
    drawHud(ctx, world);
  } else if (screen === SCREEN_CLEAR) {
    drawWorld(ctx, world, backdrop, time);
    drawClear(ctx, world);
  } else if (screen === SCREEN_OVER) {
    drawWorld(ctx, world, backdrop, time);
    drawHud(ctx, world);
    drawOver(ctx, world, best);
  } else if (screen === SCREEN_WIN) {
    drawWorld(ctx, world, backdrop, time);
    drawWin(ctx, world, best);
  }
}

// Deterministic screenshot scenes: ?shot=start|play|end (see shots.js).
const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
if (shotName) {
  const seed = Number(params.get('seed') || 1);
  shotMode = true;
  startGame(world);
  const staged = stageShot(shotName, world, seed);
  screen = staged.screen;
  best = staged.best;
  time = staged.time;
  drawScene();
} else {
  startGame(world); // idle world behind the title screen
  screen = SCREEN_TITLE;
  requestAnimationFrame(frame);
}
