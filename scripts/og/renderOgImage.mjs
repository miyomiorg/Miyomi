import fs from 'fs';
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pre-load font to pass to Satori
// Inter font buffer (fetch from google fonts API or local if available)
let fontBuffer = null;

async function getFont() {
  if (fontBuffer) return fontBuffer;
  try {
    // Fetch Inter Regular
    const res = await fetch('https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff');
    const arrayBuffer = await res.arrayBuffer();
    fontBuffer = Buffer.from(arrayBuffer);
    return fontBuffer;
  } catch (error) {
    console.error('Failed to load font buffer:', error);
    throw error;
  }
}

export async function renderToPng(satoriObj, outputPath) {
  const font = await getFont();

  const svg = await satori(satoriObj, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Inter',
        data: font,
        weight: 400,
        style: 'normal',
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, pngBuffer);
}
