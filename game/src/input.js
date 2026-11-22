// Velvet Heist — keyboard and mouse input.
// One clear job: turn raw events into a tidy state the game loop reads.
export function createInput(canvas) {
  const input = {
    up: false, down: false, left: false, right: false,
    sneak: false, interact: false,
    click: null, // {x, y} world coords of the latest left click
    rightClick: false,
    anyKey: false,
    pressed: {}, // edge-triggered keys, cleared each frame by consume()
  };

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sneak', ShiftRight: 'sneak',
    KeyE: 'interact', Space: 'interact',
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    const field = KEYMAP[e.code];
    if (field) input[field] = true;
    if (!e.repeat) input.pressed[e.code] = true;
    input.anyKey = true;
  });
  window.addEventListener('keyup', (e) => {
    const field = KEYMAP[e.code];
    if (field) input[field] = false;
  });
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = false;
    input.sneak = input.interact = false;
  });

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (e.button === 0) input.click = { x, y };
    if (e.button === 2) input.rightClick = true;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  input.consume = (code) => {
    const hit = !!input.pressed[code];
    input.pressed[code] = false;
    return hit;
  };
  input.clearClick = () => { input.click = null; input.rightClick = false; };
  return input;
}
