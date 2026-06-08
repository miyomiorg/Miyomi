import React, { useEffect, useRef, useState } from 'react';
import { SEASONAL_CONFIG, isSeasonalActive } from '../config/seasonal';
import { useTheme } from './ThemeProvider';
import { getPerformanceTier } from '../utils/performanceTier';

interface ChristmasSnowProps {
    className?: string;
    style?: React.CSSProperties;
    snowflakeCount?: number;
}

interface Particle {
    x: number;
    y: number;
    radius: number;
    speed: number;
    wind: number;
    opacity: number;
}

export function ChristmasSnow({ className, style, snowflakeCount }: ChristmasSnowProps) {
    const { theme } = useTheme();
    const isActive = isSeasonalActive();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | undefined>(undefined);
    const particlesRef = useRef<Particle[]>([]);

    const snowColor = theme === 'dark' ? '255, 255, 255' : '14, 165, 233'; // RGB values for rgba

    useEffect(() => {
        if (!isActive || !canvasRef.current) return;
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const tier = getPerformanceTier();
        if (tier === 'low') return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const handleResize = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
            } else {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
            initParticles();
        };

        // Initialize particles
        const initParticles = () => {
            const defaultCount = tier === 'medium' ? 20 : 50;
            const count = snowflakeCount ?? defaultCount;

            particlesRef.current = [];
            for (let i = 0; i < count; i++) {
                particlesRef.current.push(createParticle(canvas.width, canvas.height));
            }
        };

        const createParticle = (width: number, height: number): Particle => {
            return {
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 2 + 0.5,
                speed: Math.random() * 1 + 0.5,
                wind: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.5 + 0.3
            };
        };

        // Animation loop
        let lastTime = 0;
        const animate = (timestamp: number) => {
            if (!lastTime) lastTime = timestamp;
            const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
            lastTime = timestamp;
            const dtFactor = dt * 60; // 1.0 at 60fps

            if (!ctx || !canvas) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particlesRef.current.forEach((p, index) => {
                // Update position
                p.y += p.speed * dtFactor;
                p.x += p.wind * dtFactor;

                // Wrap around
                if (p.y > canvas.height) {
                    p.y = -5;
                    p.x = Math.random() * canvas.width;
                }
                if (p.x > canvas.width) {
                    p.x = 0;
                } else if (p.x < 0) {
                    p.x = canvas.width;
                }

                // Draw
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${snowColor}, ${p.opacity})`;
                ctx.fill();
            });

            requestRef.current = requestAnimationFrame(animate);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        requestRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [isActive, snowColor, snowflakeCount]);

    if (!isActive) return null;

    return (
        <canvas
            ref={canvasRef}
            className={`pointer-events-none z-[50] ${className || 'fixed inset-0'}`}
            style={{
                width: '100%',
                height: '100%',
                ...style
            }}
        />
    );
}