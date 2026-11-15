// Emberleap — particles: sparks, mote bursts, landing dust and the firefly
// trail. Pure data + update + draw, no assets.
export function makeParticles() {
  return { list: [] };
}

export function spawnBurst(particles, x, y, color, count, speed, life, size, gravity = 0) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    particles.list.push({
      x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - speed * 0.3,
      life: life * (0.6 + Math.random() * 0.6), maxLife: life,
      size: size * (0.6 + Math.random() * 0.8), color, gravity,
    });
  }
}

export function spawnTrail(particles, x, y) {
  particles.list.push({
    x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10,
    vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 30,
    life: 0.45, maxLife: 0.45, size: 3 + Math.random() * 3,
    color: '#ffd76a', gravity: -40,
  });
}

export function updateParticles(particles, dt) {
  const list = particles.list;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) { list.splice(i, 1); continue; }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

export function drawParticles(ctx, particles, camX) {
  for (const p of particles.list) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - camX, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
