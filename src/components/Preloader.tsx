import React, { useMemo } from 'react';

interface PreloaderProps {
  fullScreen?: boolean;
}

// --- SPRITE CONFIGURATION ---
const SPRITE_CONFIG = {
  url: '/mascot-sprite-4.png',
  width: 500, // Total width of the sprite sheet in pixels
  height: 500, // Total height of the sprite sheet in pixels
  cols: 4,
  rows: 3,
  fps: 6, // frames per second
};

export function Preloader({ fullScreen = false }: PreloaderProps) {

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
