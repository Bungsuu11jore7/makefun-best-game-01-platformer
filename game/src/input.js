// Emberleap — keyboard (arrows / WASD + Space to jump) and mouse (menus).
// The game reads a plain state object each frame; jump is edge-triggered.
export function makeInput() {
  return {
    left: false, right: false, jumpHeld: false,
    jumpPressed: false, // consumed by the world each frame
    anyPressed: false, // any key or click, for menu advance
    mouseX: 0, mouseY: 0, mouseClicked: false,
  };
}

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const JUMP_KEYS = new Set(['ArrowUp', 'KeyW', 'Space']);
const MUTE_KEYS = new Set(['KeyM']);

export function attachInput(input, canvas, onAny) {
  window.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (LEFT_KEYS.has(event.code)) input.left = true;
    if (RIGHT_KEYS.has(event.code)) input.right = true;
    if (JUMP_KEYS.has(event.code)) {
      if (!input.jumpHeld) input.jumpPressed = true;
      input.jumpHeld = true;
    }
    if (MUTE_KEYS.has(event.code) && onAny) onAny('mute');
    input.anyPressed = true;
    if (onAny) onAny('key');
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT_KEYS.has(event.code)) input.left = false;
    if (RIGHT_KEYS.has(event.code)) input.right = false;
    if (JUMP_KEYS.has(event.code)) input.jumpHeld = false;
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = event.clientX - rect.left;
    input.mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = event.clientX - rect.left;
    input.mouseY = event.clientY - rect.top;
    input.mouseClicked = true;
    input.anyPressed = true;
    if (onAny) onAny('click');
  });
  window.addEventListener('blur', () => {
    input.left = false; input.right = false; input.jumpHeld = false;
  });
}

export function endFrameInput(input) {
  input.jumpPressed = false;
  input.mouseClicked = false;
  input.anyPressed = false;
}
