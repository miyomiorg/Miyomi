import React, { useEffect, useRef } from 'react';
import type { ParticleConfig } from '@/hooks/useThemeEngine';
import { useTheme } from './ThemeProvider';
import { getPerformanceTier } from '../utils/performanceTier';

interface ParticleEffectProps {
    className?: string;
    style?: React.CSSProperties;
    config: ParticleConfig | null;
    countOverride?: number;
}

interface Particle {
    x: number;
    y: number;
    size: number;
    speed: number;
    wind: number;
    opacity: number;
    rotation: number;
    rotationSpeed: number;
    color: string;
    swayPhase: number;
    swayAmplitude: number;
}

function createParticle(
    canvas: HTMLCanvasElement,
    config: ParticleConfig,
    randomY = true
): Particle {
    const [minSpeed, maxSpeed] = config.speed;
    const [minWind, maxWind] = config.wind;
    const color = config.colors[Math.floor(Math.random() * config.colors.length)];
    const isRain = config.type === 'rain';

    return {
        x: Math.random() * canvas.width,
        y: randomY ? Math.random() * canvas.height : -20 - Math.random() * 40,
        size: isRain
            ? 10 + Math.random() * 15 // Length of rain drop
            : config.type === 'sakura'
                ? 4 + Math.random() * 8
                : 1.5 + Math.random() * 3,
        speed: (minSpeed + Math.random() * (maxSpeed - minSpeed)) * (isRain ? 2.5 : 1), // Rain falls faster
        wind: minWind + Math.random() * (maxWind - minWind),
        opacity: isRain ? 0.4 + Math.random() * 0.3 : 0.3 + Math.random() * 0.7,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.04,
        color,
        swayPhase: Math.random() * Math.PI * 2,
        swayAmplitude: isRain ? 0 : (config.type === 'sakura' ? 1.5 + Math.random() * 2 : 0.3 + Math.random() * 0.5),
    };
}

function drawSnowParticle(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.opacity;
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawRainParticle(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.beginPath();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = p.opacity;
    ctx.moveTo(p.x, p.y);
    // Draw line based on wind direction slightly to look natural
    ctx.lineTo(p.x + p.wind * 2, p.y + p.size);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function drawSakuraParticle(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity;

    // Draw a petal shape
    const s = p.size;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.8, -s * 0.8, s * 0.9, s * 0.3, 0, s);
    ctx.bezierCurveTo(-s * 0.9, s * 0.3, -s * 0.8, -s * 0.8, 0, -s);
    ctx.fillStyle = p.color;
    ctx.fill();

    // Inner detail line
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7);
    ctx.quadraticCurveTo(s * 0.15, 0, 0, s * 0.7);
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = p.opacity * 0.3;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawLeafParticle(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity;

    const s = p.size;
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.2);
    ctx.bezierCurveTo(s * 0.6, -s * 0.4, s * 0.6, s * 0.4, 0, s * 1.2);
    ctx.bezierCurveTo(-s * 0.6, s * 0.4, -s * 0.6, -s * 0.4, 0, -s * 1.2);
    ctx.fillStyle = p.color;
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();
}

export function ParticleEffect({ className, style, config, countOverride }: ParticleEffectProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animFrameRef = useRef<number>(0);
    const { theme } = useTheme();

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
    if (!config || config.type === 'none') return null;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !config || config.type === 'none') return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
        };
        resize();

        const tier = getPerformanceTier();
        const tierMultiplier = tier === 'low' ? 0.3 : tier === 'medium' ? 0.6 : 1;
        const count = Math.max(3, Math.round((countOverride ?? config.count) * tierMultiplier));

        particlesRef.current = Array.from({ length: count }, () =>
            createParticle(canvas, config, true)
        );

        let time = 0;
        let lastTime = 0;

        function animate(timestamp: number) {
            if (!lastTime) lastTime = timestamp;
            const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
            lastTime = timestamp;

            if (!canvas || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            time += dt;

            particlesRef.current.forEach((p, i) => {
                // Movement
                const sway = Math.sin(time * 2 + p.swayPhase) * p.swayAmplitude;
                p.x += p.wind + sway;
                p.y += p.speed;
                p.rotation += p.rotationSpeed;

                // Wrap around
                const bottomThreshold = canvas.height + 20;
                if (p.y > bottomThreshold) {
                    particlesRef.current[i] = createParticle(canvas, config!, false);
                }
                if (p.x < -20) p.x = canvas.width + 10;
                if (p.x > canvas.width + 20) p.x = -10;

                // Draw based on type
                switch (config!.type) {
                    case 'sakura':
                        drawSakuraParticle(ctx, p);
                        break;
                    case 'leaves':
                        drawLeafParticle(ctx, p);
                        break;
                    case 'rain':
                        drawRainParticle(ctx, p);
                        break;
                    case 'snow':
                    default:
                        drawSnowParticle(ctx, p);
                        break;
                }
            });

            animFrameRef.current = requestAnimationFrame(animate);
        }

        animFrameRef.current = requestAnimationFrame(animate);

        const observer = new ResizeObserver(resize);
        if (canvas.parentElement) observer.observe(canvas.parentElement);

        return () => {
            cancelAnimationFrame(animFrameRef.current);
            observer.disconnect();
        };
    }, [config, countOverride, theme]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{
                pointerEvents: 'none',
                ...style,
            }}
        />
    );
}
