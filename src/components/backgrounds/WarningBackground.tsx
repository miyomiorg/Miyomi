import { useEffect, useRef } from 'react';
import { getPerformanceTier } from '@/utils/performanceTier';

interface WarningBackgroundProps {
  theme?: 'light' | 'dark';
  type?: 'dmca' | 'suspended';
}

type Ember = {
  x: number;
  y: number;
  size: number;
  speedY: number;
  wobbleX: number;
  wobbleSpeed: number;
  opacity: number;
  glitchOffset: number;
};

export function WarningBackground({ theme = 'dark', type = 'suspended' }: WarningBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const embersRef = useRef<Ember[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tier = getPerformanceTier();
    if (tier === 'low') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const isDark = theme === 'dark';
    const emberCount = tier === 'medium' ? 15 : Math.min(Math.floor((canvas.width * canvas.height) / 15000), 40);
    
    // Red for DMCA, Purple for suspended
    const baseColor = type === 'dmca' 
      ? (isDark ? '225, 29, 72' : '244, 63, 94') // Rose/Red
      : (isDark ? '147, 51, 234' : '168, 85, 247'); // Purple

    embersRef.current = Array.from({ length: emberCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 1 + Math.random() * 3,
      speedY: -0.2 - Math.random() * 0.5,
      wobbleX: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.01 + Math.random() * 0.03,
      opacity: 0.2 + Math.random() * 0.5,
      glitchOffset: 0
    }));

    let lastTimestamp: number | null = null;

    const animate = (timestamp: number) => {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const delta = Math.min((timestamp - lastTimestamp) / 16.66, 2);
      lastTimestamp = timestamp;
      timeRef.current += delta;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw subtle moving scanlines
      if (tier === 'high') {
        ctx.fillStyle = `rgba(${baseColor}, 0.03)`;
        for (let i = 0; i < canvas.height; i += 4) {
          if ((i + Math.floor(timeRef.current)) % 8 < 4) {
            ctx.fillRect(0, i, canvas.width, 1);
          }
        }
      }

      // Occasional global glitch
      const isGlitching = Math.random() < 0.02;

      embersRef.current.forEach(e => {
        e.y += e.speedY * delta;
        e.wobbleX += e.wobbleSpeed * delta;
        
        if (isGlitching && Math.random() < 0.3) {
          e.glitchOffset = (Math.random() - 0.5) * 20;
        } else {
          e.glitchOffset *= 0.8; // Return to normal
        }

        const currentX = e.x + Math.sin(e.wobbleX) * 15 + e.glitchOffset;

        if (e.y < -10) {
          e.y = canvas.height + 10;
          e.x = Math.random() * canvas.width;
        }

        ctx.fillStyle = `rgba(${baseColor}, ${e.opacity})`;
        
        if (Math.random() < 0.05) {
          // Draw as a blocky glitch particle
          ctx.fillRect(currentX - e.size, e.y - e.size/2, e.size * 2 + Math.random()*10, e.size);
        } else {
          // Normal ember
          ctx.beginPath();
          ctx.arc(currentX, e.y, e.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [theme, type]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', mixBlendMode: theme === 'dark' ? 'screen' : 'multiply' }} />;
}
