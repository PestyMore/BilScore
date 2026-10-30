// src/utils/fx.ts
// 轻量粒子烟花，无第三方库。
// 优化：按 DPR 缩放、1.5s 节流、尊重 prefers-reduced-motion、切后台立即回收 canvas。

let lastFireAt = 0;
const THROTTLE_MS = 1500;
const MAX_DPR = 2; // 3x 屏上按 2x 渲染，省掉一半像素填充

class Particle {
  x: number; y: number; vx: number; vy: number;
  alpha: number; color: string; size: number; decay: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1;
    this.color = color;
    this.size = Math.random() * 3 + 2;
    this.decay = Math.random() * 0.015 + 0.01;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.05; // 重力
    this.vx *= 0.98; // 空气阻力
    this.vy *= 0.98;
    this.alpha -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const triggerFireworks = () => {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const now = Date.now();
  if (now - lastFireAt < THROTTLE_MS) return;
  lastFireAt = now;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.scale(dpr, dpr);

  const particles: Particle[] = [];
  const colors = ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#ffffff', '#e84118', '#fbc531'];

  const createExplosion = (x: number, y: number) => {
    for (let i = 0; i < 60; i++) {
      particles.push(new Particle(x, y, colors[Math.floor(Math.random() * colors.length)]));
    }
  };

  createExplosion(width / 2, height / 2);
  const timers = [
    setTimeout(() => createExplosion(width / 2 - 100, height / 2 - 50), 200),
    setTimeout(() => createExplosion(width / 2 + 100, height / 2 + 50), 400),
  ];

  let raf = 0;
  let alive = true;

  const stop = () => {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    document.removeEventListener('visibilitychange', onHidden);
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  };

  const onHidden = () => {
    // 切后台时 WebView 会暂停 rAF，回来后 canvas 会突然继续，这里直接回收
    if (document.hidden) stop();
  };
  document.addEventListener('visibilitychange', onHidden);

  const loop = () => {
    if (!alive) return;
    ctx.clearRect(0, 0, width, height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw(ctx);
      if (p.alpha <= 0) particles.splice(i, 1);
    }

    if (particles.length > 0) {
      raf = requestAnimationFrame(loop);
    } else {
      stop();
    }
  };

  loop();
};
