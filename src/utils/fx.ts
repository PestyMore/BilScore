// src/utils/fx.ts
// 简单的粒子烟花特效，无需第三方库

export const triggerFireworks = () => {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;';
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;

  const particles: Particle[] = [];
  const colors = ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#ffffff', '#e84118', '#fbc531'];

  class Particle {
    x: number; y: number; vx: number; vy: number;
    alpha: number; color: string; size: number;
    decay: number;

    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
      // 爆炸扩散速度
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.alpha = 1;
      this.color = colors[Math.floor(Math.random() * colors.length)];
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

  // 创建爆炸源
  const createExplosion = (x: number, y: number) => {
    for (let i = 0; i < 80; i++) {
      particles.push(new Particle(x, y));
    }
  };

  // 在屏幕中心和随机位置生成几次爆炸
  createExplosion(width / 2, height / 2);
  setTimeout(() => createExplosion(width / 2 - 100, height / 2 - 50), 200);
  setTimeout(() => createExplosion(width / 2 + 100, height / 2 + 50), 400);

  const loop = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw(ctx);
      if (p.alpha <= 0) particles.splice(i, 1);
    }

    if (particles.length > 0) {
      requestAnimationFrame(loop);
    } else {
      document.body.removeChild(canvas);
    }
  };

  loop();
};