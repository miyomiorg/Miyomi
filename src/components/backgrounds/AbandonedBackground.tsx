import { useEffect, useRef } from 'react';
import { getPerformanceTier } from '@/utils/performanceTier';

interface AbandonedBackgroundProps {
  theme?: 'light' | 'dark';
}

type Dust = {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  opacity: number;
};

export function AbandonedBackground({ theme = 'dark' }: AbandonedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dustRef = useRef<Dust[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, vx: 0, vy: 0 });
  const lastMouseRef = useRef({ x: -1000, y: -1000 });

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

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      mouseRef.current = {
        x: currentX,
        y: currentY,
        vx: currentX - lastMouseRef.current.x,
        vy: currentY - lastMouseRef.current.y,
      };
      
      lastMouseRef.current = { x: currentX, y: currentY };
    };
    
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000, vx: 0, vy: 0 };
    };
    
    canvas.parentElement?.addEventListener('mousemove', handleMouseMove);
    canvas.parentElement?.addEventListener('mouseleave', handleMouseLeave);

    const isDark = theme === 'dark';
    const dustCount = tier === 'medium' ? 30 : Math.min(Math.floor((canvas.width * canvas.height) / 8000), 80);
    const mouseRadius = 100;

    dustRef.current = Array.from({ length: dustCount }, () => {
      const vx = 0.5 + Math.random() * 1.5; // Wind blowing right
      const vy = (Math.random() - 0.5) * 0.5;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 0.5 + Math.random() * 2.5,
        vx,
        vy,
        baseVx: vx,
        baseVy: vy,
        opacity: 0.1 + Math.random() * 0.4
      };
    });

    let lastTimestamp: number | null = null;

    const animate = (timestamp: number) => {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const delta = Math.min((timestamp - lastTimestamp) / 16.66, 2);
      lastTimestamp = timestamp;

      // Slowly decay mouse velocity so it doesn't push forever if mouse stops
      mouseRef.current.vx *= 0.8;
      mouseRef.current.vy *= 0.8;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = isDark ? 'rgba(214, 211, 209, ' : 'rgba(120, 113, 108, ';

      dustRef.current.forEach(d => {
        // Mouse interaction (swirl)
        const dx = mouseRef.current.x - d.x;
        const dy = mouseRef.current.y - d.y;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);
        
        if (distToMouse < mouseRadius) {
          const force = (mouseRadius - distToMouse) / mouseRadius;
          // Add swirl/drag effect based on mouse velocity
          d.vx += mouseRef.current.vx * force * 0.05;
          d.vy += mouseRef.current.vy * force * 0.05;
          // Add some random scatter
          d.vx += (Math.random() - 0.5) * force;
          d.vy += (Math.random() - 0.5) * force;
        }

        // Return to base wind velocity
        d.vx += (d.baseVx - d.vx) * 0.02;
        d.vy += (d.baseVy - d.vy) * 0.02;

        // Apply friction limit
        const speed = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
        if (speed > 5) {
          d.vx = (d.vx / speed) * 5;
          d.vy = (d.vy / speed) * 5;
        }

        d.x += d.vx * delta;
        d.y += d.vy * delta;

        // Wrap around edges
        if (d.x > canvas.width + 10) d.x = -10;
        if (d.x < -10) d.x = canvas.width + 10;
        if (d.y > canvas.height + 10) d.y = -10;
        if (d.y < -10) d.y = canvas.height + 10;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.globalAlpha = d.opacity;
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.parentElement?.removeEventListener('mousemove', handleMouseMove);
      canvas.parentElement?.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }} />;
}
