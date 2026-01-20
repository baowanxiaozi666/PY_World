import React, { useEffect, useRef } from 'react';
import { Theme } from '../types';

interface ParticleEffectProps {
  theme: Theme;
}

const ParticleEffect: React.FC<ParticleEffectProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef<string>('255, 255, 255');

  useEffect(() => {
    if (theme === 'sakura') {
       // 明亮模式：白色粒子
       colorRef.current = '255, 255, 255'; 
    } else {
       // 暗黑模式：保持白色（在深色背景上更清晰）
       colorRef.current = '255, 255, 255';
    }
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    let mouse = { x: -5000, y: -5000 };

    let blackHole = {
        x: -5000,
        y: -5000,
        active: false,
        life: 0,
        maxLife: 150, 
        radius: 0,
        targetRadius: 15 
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    class Particle {
      // 使用默认初始值，避免在 strict 模式下的未初始化属性错误
      x: number = 0;
      y: number = 0;
      vx: number = 0;
      vy: number = 0;
      baseVx: number = 0;
      baseVy: number = 0;
      size: number = 1;
      density: number = 1;
      life: number = 0;
      maxLife: number = 100;

      constructor() {
        if (!canvas) throw new Error("Canvas not found");
        this.reset(true);
      }

      reset(randomStart = false) {
        if (!canvas) return;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        
        this.baseVx = (Math.random() - 0.5) * 0.5;
        this.baseVy = (Math.random() - 0.5) * 0.5;
        this.vx = this.baseVx;
        this.vy = this.baseVy;
        
        this.size = Math.random() * 2 + 1;
        this.density = (Math.random() * 30) + 1; 
        this.maxLife = Math.random() * 300 + 200;
        this.life = randomStart ? Math.random() * this.maxLife : 0;
      }

      get opacity() {
          return Math.sin((this.life / this.maxLife) * Math.PI);
      }

      update() {
        if (!canvas) return;
        this.life++;
        if (this.life >= this.maxLife) {
            this.reset();
        }

        if (blackHole.active) {
            const bhDx = blackHole.x - this.x;
            const bhDy = blackHole.y - this.y;
            const bhDist = Math.sqrt(bhDx * bhDx + bhDy * bhDy);

            if (bhDist < blackHole.radius) {
                this.reset();
                return; 
            }

            const gravityRange = 600; 
            if (bhDist < gravityRange) {
                const force = (gravityRange - bhDist) / gravityRange;
                const gravityStrength = 2.5 * force; 
                
                const angle = Math.atan2(bhDy, bhDx);
                this.vx += Math.cos(angle) * gravityStrength;
                this.vy += Math.sin(angle) * gravityStrength;
                
                const spinStrength = 0.5 * force;
                this.vx += -Math.sin(angle) * spinStrength;
                this.vy += Math.cos(angle) * spinStrength;
            }
        }

        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Increased attraction range and strength
        const attractionRadius = 400; 
        if (distance < attractionRadius) {
           const forceDirectionX = dx / distance;
           const forceDirectionY = dy / distance;
           const force = (attractionRadius - distance) / attractionRadius;
           
           const attractionStrength = 0.05; 
           this.vx += forceDirectionX * force * attractionStrength;
           this.vy += forceDirectionY * force * attractionStrength;
        }

        this.x += this.vx;
        this.y += this.vy;

        const friction = 0.02; 
        this.vx += (this.baseVx - this.vx) * friction;
        this.vy += (this.baseVy - this.vy) * friction;

        if (this.x < 0 || this.x > canvas.width) {
             this.vx *= -1; 
             this.baseVx *= -1; 
             this.x = Math.max(0, Math.min(canvas.width, this.x));
        }
        if (this.y < 0 || this.y > canvas.height) {
             this.vy *= -1; 
             this.baseVy *= -1;
             this.y = Math.max(0, Math.min(canvas.height, this.y));
        }
      }

      draw() {
        if (!ctx) return;
        const currentOpacity = this.opacity;
        if (currentOpacity < 0.01) return; 

        ctx.fillStyle = `rgba(${colorRef.current}, ${currentOpacity * 0.8})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }

      explode() {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const explosionRadius = 200;

          if (distance < explosionRadius) {
              const force = (explosionRadius - distance) / explosionRadius;
              const angle = Math.atan2(dy, dx);
              const blastStrength = 8 * force; 

              this.vx += Math.cos(angle) * blastStrength;
              this.vy += Math.sin(angle) * blastStrength;
          }
      }
    }

    const initParticles = () => {
      particles = [];
      if (!canvas) return;
      const numberOfParticles = Math.floor((canvas.width * canvas.height) / 5000); 
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const rgb = colorRef.current;

      if (blackHole.active) {
          blackHole.life--;
          
          if (blackHole.life > blackHole.maxLife * 0.2) {
              if (blackHole.radius < blackHole.targetRadius) {
                  blackHole.radius += 1.5;
              }
          } else {
              blackHole.radius *= 0.9;
          }

          if (blackHole.life <= 0) {
              blackHole.active = false;
              blackHole.radius = 0;
          }

          const gradient = ctx.createRadialGradient(blackHole.x, blackHole.y, blackHole.radius * 2, blackHole.x, blackHole.y, blackHole.radius * 10);
          gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
          gradient.addColorStop(0.2, `rgba(${rgb}, 0.05)`);
          gradient.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(blackHole.x, blackHole.y, blackHole.radius * 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(blackHole.x, blackHole.y, blackHole.radius * 3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${rgb}, 0.3)`;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.shadowBlur = 15;
          ctx.shadowColor = `rgba(${rgb}, 1)`; 
          
          ctx.beginPath();
          ctx.arc(blackHole.x, blackHole.y, blackHole.radius + 2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${rgb}, 0.9)`;
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.shadowBlur = 0;

          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(blackHole.x, blackHole.y, blackHole.radius, 0, Math.PI * 2);
          ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.update();
        p.draw();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const connectionDistance = 160;

          if (distance < connectionDistance) {
            const minParticleOpacity = Math.min(p.opacity, p2.opacity);
            
            if (minParticleOpacity > 0.05) {
                ctx.beginPath();
                const ratio = distance / connectionDistance;
                const distOpacity = (1 - ratio) * (1 - ratio); 
                
                const finalOpacity = distOpacity * minParticleOpacity * 0.4;
                
                if (finalOpacity > 0.01) {
                    ctx.strokeStyle = `rgba(${rgb}, ${finalOpacity})`;
                    ctx.lineWidth = 0.8;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    };
    
    const handleMouseLeave = () => {
        mouse.x = -5000;
        mouse.y = -5000;
    };

    const handleClick = (e: MouseEvent) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        particles.forEach(p => p.explode());
    };

    const handleDoubleClick = (e: MouseEvent) => {
        blackHole.active = true;
        blackHole.x = e.clientX;
        blackHole.y = e.clientY;
        blackHole.life = blackHole.maxLife;
        blackHole.radius = 2; 
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);
    window.addEventListener('mousedown', handleClick); 
    window.addEventListener('dblclick', handleDoubleClick); 
    
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('dblclick', handleDoubleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

export default ParticleEffect;