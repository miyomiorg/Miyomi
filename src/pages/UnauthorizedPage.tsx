import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'motion/react';

const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';

function MatrixRain() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const fontSize = 14;
        const columns = Math.floor(canvas.width / fontSize);
        const drops: number[] = new Array(columns).fill(1).map(() => Math.random() * -100);

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#0f0';
            ctx.font = `${fontSize}px "Courier New", monospace`;

            for (let i = 0; i < drops.length; i++) {
                const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];

                // Varying green shades
                const brightness = Math.random();
                if (brightness > 0.95) {
                    ctx.fillStyle = '#fff';
                } else if (brightness > 0.7) {
                    ctx.fillStyle = '#0f0';
                } else {
                    ctx.fillStyle = `rgba(0, ${Math.floor(100 + brightness * 155)}, 0, ${0.3 + brightness * 0.7})`;
                }

                ctx.fillText(char, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
        />
    );
}

// Glitch text effect
function GlitchText({ text, className }: { text: string; className?: string }) {
    return (
        <div className={`glitch-wrapper ${className || ''}`}>
            <div className="glitch-text" data-text={text}>
                {text}
            </div>
        </div>
    );
}

// Typewriter terminal log
function TerminalLog({ lines }: { lines: string[] }) {
    const [visibleLines, setVisibleLines] = useState<string[]>([]);
    const [currentLine, setCurrentLine] = useState(0);
    const [currentChar, setCurrentChar] = useState(0);

    useEffect(() => {
        if (currentLine >= lines.length) return;

        const line = lines[currentLine];
        if (currentChar < line.length) {
            const timeout = setTimeout(() => {
                setVisibleLines(prev => {
                    const newLines = [...prev];
                    newLines[currentLine] = line.substring(0, currentChar + 1);
                    return newLines;
                });
                setCurrentChar(c => c + 1);
            }, 15 + Math.random() * 25);
            return () => clearTimeout(timeout);
        } else {
            const timeout = setTimeout(() => {
                setCurrentLine(l => l + 1);
                setCurrentChar(0);
                setVisibleLines(prev => [...prev, '']);
            }, 200);
            return () => clearTimeout(timeout);
        }
    }, [currentLine, currentChar, lines]);

    return (
        <div className="font-mono text-xs sm:text-sm leading-relaxed">
            {visibleLines.map((line, i) => (
                <div key={i} className="flex">
                    <span className="text-green-500/70 mr-2 select-none">{'>'}</span>
                    <span className={
                        line.includes('DENIED') || line.includes('REJECTED') || line.includes('DESTROYED')
                            ? 'text-red-400'
                            : line.includes('DETECTED') || line.includes('WARNING') || line.includes('ALERT')
                                ? 'text-yellow-400'
                                : line.includes('LOGGED') || line.includes('TRACED')
                                    ? 'text-cyan-400'
                                    : 'text-green-400/80'
                    }>
                        {line}
                        {i === currentLine && currentChar < (lines[currentLine]?.length || 0) && (
                            <span className="animate-pulse">▊</span>
                        )}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function UnauthorizedPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const email = (location.state as any)?.email || 'unknown';
    const [countdown, setCountdown] = useState(15);
    const [showTerminal, setShowTerminal] = useState(false);
    const [showSkull, setShowSkull] = useState(false);

    // Terminal trace lines
    const terminalLines = [
        `[SYSTEM] Intrusion detection activated...`,
        `[SCAN] Analyzing auth credentials...`,
        `[TRACE] Email identified: ${email}`,
        `[AUTH] Checking admin privileges... DENIED`,
        `[WARNING] Unauthorized access attempt detected`,
        `[SECURITY] Session token... DESTROYED`,
        `[ALERT] Device fingerprint... LOGGED`,
        `[ALERT] IP address... TRACED`,
        `[NETWORK] Telegram security alert... SENT`,
        `[SYSTEM] All access... REJECTED`,
        ``,
        `[RESULT] Nice try. We see everything. 👁️`,
    ];

    useEffect(() => {
        const skullTimer = setTimeout(() => setShowSkull(true), 300);
        const termTimer = setTimeout(() => setShowTerminal(true), 1500);
        return () => {
            clearTimeout(skullTimer);
            clearTimeout(termTimer);
        };
    }, []);

    useEffect(() => {
        if (countdown <= 0) {
            navigate('/', { replace: true });
            return;
        }
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown, navigate]);

    return (
        <>
            {/* Inline styles for glitch effect */}
            <style>{`
        .glitch-text {
          position: relative;
          display: inline-block;
          animation: glitch-skew 1s infinite linear alternate-reverse;
        }
        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        .glitch-text::before {
          left: 2px;
          text-shadow: -2px 0 #ff00c1;
          clip: rect(44px, 450px, 56px, 0);
          animation: glitch-anim 5s infinite linear alternate-reverse;
        }
        .glitch-text::after {
          left: -2px;
          text-shadow: -2px 0 #00fff9, 2px 2px #ff00c1;
          clip: rect(44px, 450px, 56px, 0);
          animation: glitch-anim2 1s infinite linear alternate-reverse;
        }
        @keyframes glitch-anim {
          0% { clip: rect(31px, 9999px, 94px, 0); transform: skew(0.8deg); }
          5% { clip: rect(70px, 9999px, 71px, 0); transform: skew(0.4deg); }
          10% { clip: rect(28px, 9999px, 58px, 0); transform: skew(0.5deg); }
          15% { clip: rect(2px, 9999px, 42px, 0); transform: skew(0.3deg); }
          20% { clip: rect(52px, 9999px, 87px, 0); transform: skew(0.6deg); }
          25% { clip: rect(16px, 9999px, 74px, 0); transform: skew(0.2deg); }
          30% { clip: rect(88px, 9999px, 99px, 0); transform: skew(0.8deg); }
          35% { clip: rect(45px, 9999px, 51px, 0); transform: skew(0.1deg); }
          40% { clip: rect(62px, 9999px, 93px, 0); transform: skew(0.7deg); }
          45% { clip: rect(7px, 9999px, 33px, 0); transform: skew(0.4deg); }
          50% { clip: rect(81px, 9999px, 95px, 0); transform: skew(0.2deg); }
          55% { clip: rect(19px, 9999px, 68px, 0); transform: skew(0.6deg); }
          60% { clip: rect(39px, 9999px, 79px, 0); transform: skew(0.3deg); }
          65% { clip: rect(5px, 9999px, 48px, 0); transform: skew(0.8deg); }
          70% { clip: rect(71px, 9999px, 84px, 0); transform: skew(0.1deg); }
          75% { clip: rect(24px, 9999px, 60px, 0); transform: skew(0.5deg); }
          80% { clip: rect(48px, 9999px, 90px, 0); transform: skew(0.4deg); }
          85% { clip: rect(14px, 9999px, 37px, 0); transform: skew(0.7deg); }
          90% { clip: rect(55px, 9999px, 76px, 0); transform: skew(0.3deg); }
          95% { clip: rect(33px, 9999px, 69px, 0); transform: skew(0.6deg); }
          100% { clip: rect(10px, 9999px, 85px, 0); transform: skew(0.2deg); }
        }
        @keyframes glitch-anim2 {
          0% { clip: rect(65px, 9999px, 99px, 0); transform: skew(0.4deg); }
          5% { clip: rect(15px, 9999px, 54px, 0); transform: skew(0.8deg); }
          10% { clip: rect(79px, 9999px, 98px, 0); transform: skew(0.1deg); }
          15% { clip: rect(22px, 9999px, 47px, 0); transform: skew(0.5deg); }
          20% { clip: rect(58px, 9999px, 82px, 0); transform: skew(0.3deg); }
          25% { clip: rect(33px, 9999px, 66px, 0); transform: skew(0.7deg); }
          30% { clip: rect(9px, 9999px, 39px, 0); transform: skew(0.2deg); }
          35% { clip: rect(72px, 9999px, 91px, 0); transform: skew(0.6deg); }
          40% { clip: rect(41px, 9999px, 73px, 0); transform: skew(0.4deg); }
          45% { clip: rect(18px, 9999px, 55px, 0); transform: skew(0.8deg); }
          50% { clip: rect(86px, 9999px, 100px, 0); transform: skew(0.1deg); }
          55% { clip: rect(27px, 9999px, 61px, 0); transform: skew(0.5deg); }
          60% { clip: rect(50px, 9999px, 78px, 0); transform: skew(0.3deg); }
          65% { clip: rect(3px, 9999px, 35px, 0); transform: skew(0.7deg); }
          70% { clip: rect(67px, 9999px, 88px, 0); transform: skew(0.2deg); }
          75% { clip: rect(36px, 9999px, 70px, 0); transform: skew(0.6deg); }
          80% { clip: rect(12px, 9999px, 44px, 0); transform: skew(0.4deg); }
          85% { clip: rect(54px, 9999px, 83px, 0); transform: skew(0.8deg); }
          90% { clip: rect(25px, 9999px, 56px, 0); transform: skew(0.1deg); }
          95% { clip: rect(76px, 9999px, 96px, 0); transform: skew(0.5deg); }
          100% { clip: rect(41px, 9999px, 67px, 0); transform: skew(0.3deg); }
        }
        @keyframes glitch-skew {
          0% { transform: skew(2deg); }
          10% { transform: skew(-1deg); }
          20% { transform: skew(4deg); }
          30% { transform: skew(-2deg); }
          40% { transform: skew(1deg); }
          50% { transform: skew(-3deg); }
          60% { transform: skew(2deg); }
          70% { transform: skew(-1deg); }
          80% { transform: skew(3deg); }
          90% { transform: skew(-2deg); }
          100% { transform: skew(1deg); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes pulse-red {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.03; }
        }
      `}</style>

            <div className="fixed inset-0 bg-black overflow-hidden select-none" style={{ zIndex: 9999 }}>
                {/* Matrix Rain Background */}
                <MatrixRain />

                {/* Scanline overlay */}
                <div
                    className="fixed inset-0 pointer-events-none"
                    style={{
                        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px)',
                        zIndex: 1,
                    }}
                />

                {/* Moving scanline */}
                <div
                    className="fixed left-0 right-0 h-24 pointer-events-none"
                    style={{
                        background: 'linear-gradient(transparent, rgba(0,255,0,0.08), transparent)',
                        animation: 'scanline 4s linear infinite',
                        zIndex: 2,
                    }}
                />

                {/* Red pulse */}
                <div
                    className="fixed inset-0 pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle at center, rgba(255,0,0,0.15), transparent 70%)',
                        animation: 'pulse-red 2s ease-in-out infinite',
                        zIndex: 2,
                    }}
                />

                {/* Content */}
                <div className="relative flex flex-col items-center justify-center min-h-screen px-4 py-8" style={{ zIndex: 10 }}>

                    {/* Skull / Warning Icon */}
                    <AnimatePresence>
                        {showSkull && (
                            <motion.div
                                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                className="text-7xl sm:text-8xl mb-6"
                                style={{ filter: 'drop-shadow(0 0 30px rgba(255,0,0,0.5))' }}
                            >
                                💀
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ACCESS DENIED */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                    >
                        <GlitchText
                            text="ACCESS DENIED"
                            className="text-4xl sm:text-6xl lg:text-7xl font-black text-red-500 tracking-[0.2em] mb-2"
                        />
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="text-red-400/70 text-sm sm:text-base font-mono tracking-widest mb-8 uppercase"
                    >
                        UNAUTHORIZED INTRUSION DETECTED
                    </motion.p>

                    {/* Terminal Box */}
                    <AnimatePresence>
                        {showTerminal && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scaleY: 0 }}
                                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                                transition={{ duration: 0.3 }}
                                className="w-full max-w-xl"
                            >
                                <div
                                    className="rounded-lg border overflow-hidden"
                                    style={{
                                        background: 'rgba(0, 0, 0, 0.85)',
                                        borderColor: 'rgba(0, 255, 0, 0.2)',
                                        boxShadow: '0 0 40px rgba(0, 255, 0, 0.1), inset 0 0 40px rgba(0, 0, 0, 0.5)',
                                    }}
                                >
                                    {/* Terminal Header */}
                                    <div
                                        className="flex items-center gap-2 px-4 py-2 border-b"
                                        style={{ borderColor: 'rgba(0, 255, 0, 0.15)', background: 'rgba(0, 255, 0, 0.05)' }}
                                    >
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                        <span className="ml-2 text-green-500/50 text-xs font-mono">MIYOMI_SECURITY_v2.0</span>
                                    </div>

                                    {/* Terminal Content */}
                                    <div className="p-4 max-h-64 overflow-y-auto">
                                        <TerminalLog lines={terminalLines} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Countdown & Actions */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.5 }}
                        className="mt-8 flex flex-col items-center gap-4"
                    >
                        <p className="text-green-500/50 text-sm font-mono">
                            Redirecting to safety in{' '}
                            <span className="text-green-400 font-bold text-lg">{countdown}</span>s
                        </p>

                        <motion.button
                            whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/', { replace: true })}
                            className="px-8 py-3 rounded-lg font-mono font-bold text-sm tracking-widest uppercase transition-all border"
                            style={{
                                background: 'rgba(0, 255, 0, 0.08)',
                                borderColor: 'rgba(0, 255, 0, 0.3)',
                                color: 'rgba(0, 255, 0, 0.8)',
                            }}
                        >
                            ← ESCAPE TO SAFETY
                        </motion.button>

                        <p className="text-white/10 text-[10px] font-mono mt-4 text-center max-w-sm">
                            This incident has been logged and reported. Your device fingerprint, IP address, and session data have been recorded.
                        </p>
                    </motion.div>
                </div>

                {/* Bottom scanline bar */}
                <div
                    className="fixed bottom-0 left-0 right-0 h-1"
                    style={{
                        background: 'linear-gradient(to right, transparent, rgba(255,0,0,0.5), transparent)',
                        zIndex: 10,
                    }}
                />
            </div>
        </>
    );
}
