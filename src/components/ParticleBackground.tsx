import { useEffect, useRef } from 'react';
import { getPerformanceTier } from '../utils/performanceTier';

interface ParticleBackgroundProps {
  theme?: 'light' | 'dark';
}

type Heart = {
  x: number;
  y: number;
  size: number;
  speed: number;
  wobble: number;
  wobbleSpeed: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  pulsePhase: number;
  color: string;
};

type Star = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinklePhase: number;
  twinkleSpeed: number;
  rotation: number;
};

type FloatingCircle = {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  color: string;
  pulse: number;
  pulseSpeed: number;
};

type Halftone = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  growthPhase: number;
};

export function ParticleBackground({ theme = 'dark' }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heartsRef = useRef<Heart[]>([]);
  const starsRef = useRef<Star[]>([]);
  const circlesRef = useRef<FloatingCircle[]>([]);
  const halftonesRef = useRef<Halftone[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const gradientOffsetRef = useRef(0);
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

    // Anime-inspired vibrant color palettes
    const heartColors = {
      light: [
        'rgba(236, 72, 153, 0.7)',  // Hot Pink
        'rgba(251, 113, 133, 0.6)', // Rose
        'rgba(244, 114, 182, 0.6)', // Pink
      ],
      dark: [
        'rgba(251, 113, 133, 0.8)', // Rose
        'rgba(236, 72, 153, 0.7)',  // Hot Pink
        'rgba(244, 114, 182, 0.7)', // Pink
      ],
    };

    const circleColors = {
      light: [
        'rgba(56, 189, 248, 0.4)',  // Electric Cyan (brand)
        'rgba(125, 211, 252, 0.3)', // Light Cyan
        'rgba(147, 197, 253, 0.3)', // Sky Blue
        'rgba(196, 181, 253, 0.3)', // Lavender
      ],
      dark: [
        'rgba(56, 189, 248, 0.6)',  // Electric Cyan (brand)
        'rgba(125, 211, 252, 0.5)', // Bright Cyan
        'rgba(139, 92, 246, 0.4)',  // Purple
        'rgba(147, 197, 253, 0.4)', // Sky Blue
      ],
    };

    const effectiveTheme: 'light' | 'dark' = theme === 'light' || theme === 'dark' ? theme : 'dark';
    const heartPalette = heartColors[effectiveTheme];
    const circlePalette = circleColors[effectiveTheme];

    // Particle counts
    const heartCount = tier === 'medium' ? 6 : Math.min(Math.floor((canvas.width * canvas.height) / 30000), 15);
    const starCount = tier === 'medium' ? 12 : Math.min(Math.floor((canvas.width * canvas.height) / 15000), 30);
    const circleCount = tier === 'medium' ? 8 : Math.min(Math.floor((canvas.width * canvas.height) / 20000), 20);
    const halftoneCount = tier === 'medium' ? 0 : Math.min(Math.floor((canvas.width * canvas.height) / 25000), 25);

    // Create cute floating heart
    const createHeart = (): Heart => {
      return {
        x: Math.random() * canvas.width,
        y: canvas.height + 50,
        size: 8 + Math.random() * 12,
        speed: 0.5 + Math.random() * 1.5,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.02,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        opacity: 0.5 + Math.random() * 0.4,
        pulsePhase: Math.random() * Math.PI * 2,
        color: heartPalette[Math.floor(Math.random() * heartPalette.length)],
      };
    };

    // Create twinkling star
    const createStar = (): Star => {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 2 + Math.random() * 4,
        opacity: 0.3 + Math.random() * 0.5,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.05 + Math.random() * 0.05,
        rotation: Math.random() * Math.PI * 2,
      };
    };

    // Create floating circle
    const createCircle = (): FloatingCircle => {
      const depth = Math.random();
      return {
        x: Math.random() * canvas.width,
        y: canvas.height + 30,
        size: 15 + depth * 40,
        speed: 0.2 + depth * 0.8,
        opacity: 0.15 + depth * 0.2,
        color: circlePalette[Math.floor(Math.random() * circlePalette.length)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
      };
    };

    // Create halftone dot
    const createHalftone = (): Halftone => {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 1 + Math.random() * 3,
        opacity: 0.1 + Math.random() * 0.15,
        growthPhase: Math.random() * Math.PI * 2,
      };
    };

    // Initialize particles
    heartsRef.current = Array.from({ length: heartCount }, createHeart);
    starsRef.current = Array.from({ length: starCount }, createStar);
    circlesRef.current = Array.from({ length: circleCount }, createCircle);
    halftonesRef.current = Array.from({ length: halftoneCount }, createHalftone);

    let lastTimestamp: number | null = null;

    // Draw cute heart shape
    const drawHeart = (h: Heart) => {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.rotation);

      const pulse = 1 + Math.sin(h.pulsePhase) * 0.15; // Bouncy pulse
      const size = h.size * pulse;

      ctx.globalAlpha = h.opacity;
      ctx.fillStyle = h.color;

      // Heart path
      ctx.beginPath();
      ctx.moveTo(0, size * 0.3);
      // Left bump
      ctx.bezierCurveTo(
        -size * 0.6, -size * 0.2,
        -size * 0.6, size * 0.3,
        0, size * 0.7
      );
      // Right bump
      ctx.bezierCurveTo(
        size * 0.6, size * 0.3,
        size * 0.6, -size * 0.2,
        0, size * 0.3
      );
      ctx.fill();

      ctx.restore();
    };

    // Draw twinkling star
    const drawStar = (s: Star) => {
      const twinkle = 0.5 + Math.sin(s.twinklePhase) * 0.5;
      const alpha = s.opacity * twinkle;

      if (alpha <= 0.1) return;

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);
      ctx.globalAlpha = alpha;

      const color = effectiveTheme === 'dark' ? '#38BDF8' : '#0ea5e9';
      ctx.fillStyle = color;

      // 4-point star
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + s.rotation;
        const length = i % 2 === 0 ? s.size : s.size * 0.4;
        const x = Math.cos(angle) * length;
        const y = Math.sin(angle) * length;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    // Draw floating circle
    const drawCircle = (c: FloatingCircle) => {
      const currentSize = c.size + Math.sin(c.pulse) * (c.size * 0.2);
      const gradient = ctx.createRadialGradient(
        c.x, c.y, 0,
        c.x, c.y, currentSize
      );

      const baseColor = c.color.replace(/[\d.]+\)$/g, '0.6)');
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(0.5, c.color);
      gradient.addColorStop(1, c.color.replace(/[\d.]+\)$/g, '0)'));

      ctx.globalAlpha = c.opacity;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(c.x, c.y, currentSize, 0, Math.PI * 2);
      ctx.fill();
    };

    // Draw halftone dot (manga style)
    const drawHalftone = (ht: Halftone) => {
      const growth = 0.8 + Math.sin(ht.growthPhase) * 0.2;
      const size = ht.size * growth;

      ctx.globalAlpha = ht.opacity;
      const color = effectiveTheme === 'dark' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(14, 165, 233, 0.2)';
      ctx.fillStyle = color;

      ctx.beginPath();
      ctx.arc(ht.x, ht.y, size, 0, Math.PI * 2);
      ctx.fill();
    };

    // Draw animated gradient overlay
    const drawGradientOverlay = () => {
      const gradient = ctx.createLinearGradient(
        0, 0, canvas.width, canvas.height
      );

      if (effectiveTheme === 'dark') {
        // Electric cyan theme
        gradient.addColorStop(0, `rgba(56, 189, 248, ${0.02 + Math.sin(gradientOffsetRef.current) * 0.01})`);
        gradient.addColorStop(0.5, `rgba(139, 92, 246, ${0.015 + Math.cos(gradientOffsetRef.current * 1.2) * 0.01})`);
        gradient.addColorStop(1, `rgba(236, 72, 153, ${0.02 + Math.sin(gradientOffsetRef.current * 0.9) * 0.01})`);
      } else {
        gradient.addColorStop(0, `rgba(147, 197, 253, ${0.03 + Math.sin(gradientOffsetRef.current) * 0.015})`);
        gradient.addColorStop(0.5, `rgba(196, 181, 253, ${0.025 + Math.cos(gradientOffsetRef.current * 1.2) * 0.01})`);
        gradient.addColorStop(1, `rgba(251, 207, 232, ${0.03 + Math.sin(gradientOffsetRef.current * 0.9) * 0.015})`);
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    // Draw manga-style speed lines (subtle)
    const drawSpeedLines = () => {
      if (tier === 'medium') return; // Skip on medium
      if (Math.floor(timeRef.current) % 5 !== 0) return; // Only occasionally

      ctx.save();
      ctx.globalAlpha = 0.05 + Math.sin(timeRef.current * 0.5) * 0.03;
      ctx.strokeStyle = effectiveTheme === 'dark' ? '#38BDF8' : '#0ea5e9';
      ctx.lineWidth = 1;

      for (let i = 0; i < 3; i++) {
        const y = (canvas.height / 4) * (i + 1);
        const offset = Math.sin(timeRef.current + i) * 20;

        ctx.beginPath();
        ctx.moveTo(0, y + offset);
        ctx.lineTo(canvas.width, y + offset);
        ctx.stroke();
      }

      ctx.restore();
    };

    const animate = (timestamp: number) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }

      const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
      lastTimestamp = timestamp;
      timeRef.current += deltaSeconds;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw gradient overlay
      drawGradientOverlay();
      gradientOffsetRef.current += deltaSeconds * 0.3;

      // Draw halftone dots (back layer)
      halftonesRef.current.forEach((ht) => {
        ht.growthPhase += 0.02;
        drawHalftone(ht);
      });

      // Draw speed lines (subtle)
      drawSpeedLines();

      // Draw floating circles (middle-back layer)
      circlesRef.current.forEach((c) => {
        c.y -= c.speed;
        c.pulse += c.pulseSpeed;

        if (c.y < -c.size - 30) {
          Object.assign(c, createCircle());
        }

        drawCircle(c);
      });

      // Draw stars (middle layer)
      starsRef.current.forEach((s) => {
        s.twinklePhase += s.twinkleSpeed;
        s.rotation += 0.01;
        drawStar(s);
      });

      // Draw hearts (front layer)
      heartsRef.current.forEach((h) => {
        h.y -= h.speed;
        h.wobble += h.wobbleSpeed;
        h.x += Math.sin(h.wobble) * 0.3;
        h.rotation += h.rotationSpeed;
        h.pulsePhase += 0.05; // Bouncy pulse

        if (h.y < -h.size - 50) {
          Object.assign(h, createHeart());
        }

        drawHeart(h);
      });

      ctx.globalAlpha = 1;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
