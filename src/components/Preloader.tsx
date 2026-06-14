import React, { useMemo } from 'react';

interface PreloaderProps {
  fullScreen?: boolean;
  topBar?: boolean;
}

// --- SPRITE CONFIGURATION ---
const SPRITE_CONFIG = {
  url: '/mascot-run.png',
  width: 500, // Total width of the sprite sheet in pixels
  height: 500, // Total height of the sprite sheet in pixels
  cols: 4,
  rows: 3,
  fps: 12, // frames per second
};

export function Preloader({ fullScreen = false, topBar = false }: PreloaderProps) {

  // Dynamically generate the keyframes for a 2D sprite grid
  const styleStr = useMemo(() => {
    const { cols, rows, fps } = SPRITE_CONFIG;
    const totalFrames = cols * rows;
    const duration = totalFrames / fps;

    let keyframes = `@keyframes play-grid-sprite {\n`;

    for (let i = 0; i < totalFrames; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      // Calculate CSS background-position percentages
      const x = cols > 1 ? (col / (cols - 1)) * 100 : 0;
      const y = rows > 1 ? (row / (rows - 1)) * 100 : 0;

      const pct = (i / totalFrames) * 100;
      keyframes += `  ${pct.toFixed(2)}% { background-position: ${x.toFixed(2)}% ${y.toFixed(2)}%; }\n`;
    }

    // Add 100% frame to close the loop
    keyframes += `  100% { background-position: 100% 100%; }\n`;
    keyframes += `}\n`;

    keyframes += `
      .grid-sprite-anim {
        background-image: url('${SPRITE_CONFIG.url}');
        background-size: ${cols * 100}% ${rows * 100}%;
        background-repeat: no-repeat;
        /* Using step-end ensures crisp frame transitions without tweening */
        animation: play-grid-sprite ${duration}s step-end infinite;
        /* Automatically calculate aspect ratio from original dimensions */
        aspect-ratio: calc((${SPRITE_CONFIG.width} / ${cols}) / (${SPRITE_CONFIG.height} / ${rows}));
      }
    `;

    return keyframes;
  }, []);

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* 
        The container defines the size of ONE frame. 
        It is responsive and will scale the sprite automatically.
      */}
      <style>{styleStr}</style>
      <div
        className="w-32 md:w-40 h-auto grid-sprite-anim drop-shadow-xl"
        aria-label="Loading animation"
      />
      <div className="text-[var(--text-secondary)] font-medium text-sm animate-pulse tracking-widest uppercase">
        Loading...
      </div>
    </div>
  );

  if (topBar) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] h-1 pointer-events-none">
        <style>{styleStr}</style>
        <style>
          {`
            @keyframes load-progress {
              0% { width: 0%; }
              50% { width: 70%; }
              90% { width: 95%; }
              100% { width: 100%; }
            }
            @keyframes run-across {
              0% { left: 0%; transform: translateX(0); }
              50% { left: 70%; transform: translateX(-50%); }
              90% { left: 95%; transform: translateX(-100%); }
              100% { left: 100%; transform: translateX(-100%); }
            }
          `}
        </style>
        {/* Progress Bar Line */}
        <div
          className="absolute top-0 left-0 h-full bg-[var(--brand)] shadow-[0_0_10px_var(--brand)]"
          style={{ animation: 'load-progress 2s cubic-bezier(0.4, 0, 0.2, 1) forwards' }}
        />
        {/* Running Sprite container sitting on the bar */}
        <div
          className="absolute top-1"
          style={{ animation: 'run-across 2s cubic-bezier(0.4, 0, 0.2, 1) forwards' }}
        >
          <div
            className="w-6 md:w-8 h-auto grid-sprite-anim drop-shadow-md"
            aria-label="Loading animation"
          />
        </div>
      </div>
    );
  }

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg-page)] transition-colors duration-300">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full p-8">
      {content}
    </div>
  );
}
