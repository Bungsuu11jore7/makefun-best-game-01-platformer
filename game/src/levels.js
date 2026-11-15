// Emberleap — the three levels. Each level is a hand-built chain of floating
// ember islands over the void: platforms to stand on, light motes to collect,
// void wisps that drift back and forth, and a lantern gate at the far end.
// Coordinates are world pixels; the camera scrolls horizontally. y grows down.
export const LEVEL_NAMES = ['First Glow', 'Wisp Hollow', "Lantern's Edge"];
export const LEVEL_PARS = [45, 60, 75]; // par times in seconds, for the time bonus

function platform(x, y, w, h = 26) { return { x, y, w, h, kind: 'solid' }; }
function mover(x, y, w, axis, range, speed) {
  return { x, y, w, h: 24, kind: 'mover', axis, range, speed, baseX: x, baseY: y, phase: 0 };
}
function mote(x, y) { return { x, y, taken: false }; }
function wisp(x, y, range, speed) { return { x, y, range, speed, phase: 0 }; }

export function buildLevel(index) {
  if (index === 0) {
    return {
      name: LEVEL_NAMES[0], par: LEVEL_PARS[0], width: 3400, height: 720,
      spawn: { x: 90, y: 520 },
      gate: { x: 3220, y: 470 },
      platforms: [
        platform(0, 620, 420), platform(500, 560, 240), platform(820, 500, 200),
        platform(1100, 560, 260), platform(1440, 470, 200), platform(1720, 540, 240),
        platform(2040, 460, 220), platform(2340, 540, 200), platform(2620, 470, 240),
        platform(2940, 540, 200), platform(3180, 560, 220),
      ],
      motes: [mote(580, 500), mote(900, 440), mote(1200, 500), mote(1520, 410),
        mote(1820, 480), mote(2130, 400), mote(2430, 480), mote(2720, 410),
        mote(3030, 480), mote(3240, 500)],
      wisps: [wisp(1300, 480, 90, 70), wisp(2500, 460, 100, 80)],
    };
  }
  if (index === 1) {
    return {
      name: LEVEL_NAMES[1], par: LEVEL_PARS[1], width: 4000, height: 720,
      spawn: { x: 90, y: 520 },
      gate: { x: 3820, y: 450 },
      platforms: [
        platform(0, 620, 360), platform(440, 540, 180), platform(700, 470, 170),
        platform(950, 560, 190), mover(1220, 500, 150, 'x', 130, 55),
        platform(1520, 460, 180), platform(1780, 540, 170), platform(2030, 450, 180),
        mover(2290, 520, 150, 'y', 90, 60), platform(2580, 460, 190),
        platform(2850, 550, 170), platform(3100, 460, 180), platform(3360, 540, 170),
        platform(3610, 470, 190), platform(3800, 550, 200),
      ],
      motes: [mote(520, 480), mote(780, 410), mote(1030, 500), mote(1290, 440),
        mote(1600, 400), mote(1860, 480), mote(2110, 390), mote(2360, 460),
        mote(2660, 400), mote(2930, 490), mote(3180, 400), mote(3690, 410)],
      wisps: [wisp(850, 460, 110, 95), wisp(1650, 470, 120, 100),
        wisp(2450, 480, 110, 110), wisp(3250, 470, 120, 105)],
    };
  }
  return {
    name: LEVEL_NAMES[2], par: LEVEL_PARS[2], width: 4600, height: 720,
    spawn: { x: 90, y: 520 },
    gate: { x: 4420, y: 440 },
    platforms: [
      platform(0, 620, 320), platform(400, 520, 150), platform(620, 440, 150),
      mover(850, 500, 130, 'x', 150, 80), platform(1130, 430, 150),
      platform(1360, 520, 140), mover(1580, 450, 130, 'y', 110, 85),
      platform(1830, 430, 150), platform(2060, 540, 140), platform(2280, 440, 150),
      mover(2510, 520, 130, 'x', 160, 90), platform(2800, 430, 150),
      platform(3030, 530, 140), platform(3250, 440, 150), mover(3480, 510, 130, 'y', 100, 95),
      platform(3730, 430, 150), platform(3960, 530, 150), platform(4190, 450, 160),
      platform(4400, 540, 200),
    ],
    motes: [mote(470, 460), mote(690, 380), mote(920, 440), mote(1200, 370),
      mote(1430, 460), mote(1640, 390), mote(1900, 370), mote(2130, 480),
      mote(2350, 380), mote(2580, 460), mote(2870, 370), mote(3100, 470),
      mote(3320, 380), mote(3800, 370), mote(4260, 390)],
    wisps: [wisp(750, 450, 120, 120), wisp(1470, 460, 120, 125),
      wisp(2200, 470, 130, 130), wisp(2650, 460, 130, 120),
      wisp(3350, 470, 120, 135), wisp(4080, 460, 130, 125)],
  };
}

export const LEVEL_COUNT = 3;
