import { useEffect, useRef } from 'react';
import { getPerformanceTier } from '@/utils/performanceTier';

interface DeadBackgroundProps {
  theme?: 'light' | 'dark';
}

type Node = {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
};

export function DeadBackground({ theme = 'dark' }: DeadBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

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
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    
    // Add non-passive event listeners for interactivity, but we don't need to prevent default
    canvas.parentElement?.addEventListener('mousemove', handleMouseMove);
    canvas.parentElement?.addEventListener('mouseleave', handleMouseLeave);

    const isDark = theme === 'dark';
    const nodeCount = tier === 'medium' ? 25 : Math.min(Math.floor((canvas.width * canvas.height) / 10000), 60);
    const maxDistance = 120;
    const mouseRadius = 150;

    nodesRef.current = Array.from({ length: nodeCount }, () => {
      const vx = (Math.random() - 0.5) * 0.4;
      const vy = (Math.random() - 0.5) * 0.4;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 1.5 + Math.random() * 2,
        vx,
        vy,
        baseVx: vx,
        baseVy: vy,
      };
    });

    let lastTimestamp: number | null = null;

    const animate = (timestamp: number) => {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const delta = Math.min((timestamp - lastTimestamp) / 16.66, 2); // normalize to 60fps
      lastTimestamp = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const nodeColor = isDark ? 'rgba(71, 85, 105, ' : 'rgba(148, 163, 184, ';
      const lineColor = isDark ? 'rgba(71, 85, 105, ' : 'rgba(148, 163, 184, ';

      nodesRef.current.forEach((n, i) => {
        // Mouse interaction (push away)
        const dx = mouseRef.current.x - n.x;
        const dy = mouseRef.current.y - n.y;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);
        
        if (distToMouse < mouseRadius) {
          const force = (mouseRadius - distToMouse) / mouseRadius;
          n.vx -= (dx / distToMouse) * force * 0.2;
          n.vy -= (dy / distToMouse) * force * 0.2;
        }

        // Return to base velocity
        n.vx += (n.baseVx - n.vx) * 0.05;
        n.vy += (n.baseVy - n.vy) * 0.05;

        // Apply friction limit
        const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (speed > 2) {
          n.vx = (n.vx / speed) * 2;
          n.vy = (n.vy / speed) * 2;
        }

        n.x += n.vx * delta;
        n.y += n.vy * delta;

        // Wrap around edges
        if (n.x < 0) n.x = canvas.width;
        if (n.x > canvas.width) n.x = 0;
        if (n.y < 0) n.y = canvas.height;
        if (n.y > canvas.height) n.y = 0;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
        ctx.fillStyle = `${nodeColor}0.8)`;
        ctx.fill();

        // Connect nearby nodes
        for (let j = i + 1; j < nodesRef.current.length; j++) {
          const n2 = nodesRef.current[j];
          const dx2 = n.x - n2.x;
          const dy2 = n.y - n2.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          
          if (dist2 < maxDistance) {
            const opacity = 1 - (dist2 / maxDistance);
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = `${lineColor}${opacity * 0.3})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      });

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
