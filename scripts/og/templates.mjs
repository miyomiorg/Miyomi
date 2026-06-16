// scripts/og/templates.mjs
// Clean Miyomi OG template for Satori.
// 1200x630, code-generated, no baked text/background placeholders.

const W = 1200;
const H = 630;

const BRAND = {
  bg0: '#041226',
  bg1: '#071b35',
  bg2: '#082f5f',
  blue: '#22a8ff',
  violet: '#7c5cff',
  text: '#f8fbff',
  muted: '#a7b7d8',
  panel: 'rgba(9, 24, 50, 0.62)',
  panelSoft: 'rgba(255,255,255,0.08)',
  line: 'rgba(69, 169, 255, 0.34)',
};

function cleanText(value = '') {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function truncate(value = '', max = 90) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '…';
}

function formatNumber(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`;
  return n.toLocaleString('en-US');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function hexToRgba(hex = BRAND.blue, alpha = 1) {
  const clean = String(hex).replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(clean)) return `rgba(34,168,255,${alpha})`;
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function darkAccent(hex = BRAND.blue) {
  const clean = String(hex).replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(clean)) return BRAND.bg2;
  const num = parseInt(clean, 16);
  const r = Math.max(4, Math.round(((num >> 16) & 255) * 0.18));
  const g = Math.max(18, Math.round(((num >> 8) & 255) * 0.18));
  const b = Math.max(38, Math.round((num & 255) * 0.32));
  return `rgb(${r},${g},${b})`;
}

function hText(children, style = {}) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        whiteSpace: 'pre-wrap',
        ...style,
      },
      children,
    },
  };
}

const langMap = {
  en: 'English', es: 'Spanish', fr: 'French', ja: 'Japanese',
  zh: 'Chinese', pt: 'Portuguese', ru: 'Russian', ar: 'Arabic',
  it: 'Italian', de: 'German', id: 'Indonesian', th: 'Thai',
  vi: 'Vietnamese', ko: 'Korean', multi: 'Multi', all: 'All'
};

function getLangName(code) {
  if (!code) return 'Multi';
  const c = code.toLowerCase().trim();
  return langMap[c] || code.toUpperCase();
}

function HeartIcon(color) {
  return { type: 'svg', props: { viewBox: '0 0 24 24', width: '24', height: '24', fill: 'none', stroke: color, strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', children: [{ type: 'path', props: { d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' } }] } };
}

function CalendarIcon(color) {
  return { type: 'svg', props: { viewBox: '0 0 24 24', width: '24', height: '24', fill: 'none', stroke: color, strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', children: [{ type: 'rect', props: { x: '3', y: '4', width: '18', height: '18', rx: '2', ry: '2' } }, { type: 'line', props: { x1: '16', y1: '2', x2: '16', y2: '6' } }, { type: 'line', props: { x1: '8', y1: '2', x2: '8', y2: '6' } }, { type: 'line', props: { x1: '3', y1: '10', x2: '21', y2: '10' } }] } };
}

function DownloadIcon(color) {
  return { type: 'svg', props: { viewBox: '0 0 24 24', width: '24', height: '24', fill: 'none', stroke: color, strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', children: [{ type: 'path', props: { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' } }, { type: 'polyline', props: { points: '7 10 12 15 17 10' } }, { type: 'line', props: { x1: '12', y1: '15', x2: '12', y2: '3' } }] } };
}

function GlobeIcon(color) {
  return { type: 'svg', props: { viewBox: '0 0 24 24', width: '24', height: '24', fill: 'none', stroke: color, strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', children: [{ type: 'circle', props: { cx: '12', cy: '12', r: '10' } }, { type: 'line', props: { x1: '2', y1: '12', x2: '22', y2: '12' } }, { type: 'path', props: { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' } }] } };
}

function AvatarIcon(color) {
  return { type: 'svg', props: { viewBox: '0 0 24 24', width: '24', height: '24', fill: 'none', stroke: color, strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', children: [{ type: 'path', props: { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' } }, { type: 'circle', props: { cx: '12', cy: '7', r: '4' } }] } };
}

function AppTypeIcon(color) {
  return { type: 'svg', props: { viewBox: '0 0 24 24', width: '24', height: '24', fill: 'none', stroke: color, strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', children: [{ type: 'rect', props: { x: '3', y: '3', width: '18', height: '18', rx: '2', ry: '2' } }, { type: 'path', props: { d: 'M3 9h18' } }, { type: 'path', props: { d: 'M9 21V9' } }] } };
}

function statBox({ label, value, color, icon }) {
  return {
    type: 'div',
    props: {
      style: {
        flex: 1,
        minWidth: 0,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 28px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              width: 44,
              height: 44,
              borderRadius: 12,
              border: `1px solid ${hexToRgba(color, 0.55)}`,
              background: hexToRgba(color, 0.10),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
              fontSize: 22,
              fontWeight: 800,
            },
            children: icon || '',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minWidth: 0,
            },
            children: [
              hText(value, {
                fontSize: 26,
                fontWeight: 800,
                color: BRAND.text,
                lineHeight: 1.05,
                maxWidth: 180,
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }),
              hText(label, {
                marginTop: 5,
                fontSize: 18,
                fontWeight: 600,
                color: BRAND.muted,
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }),
            ],
          },
        },
      ],
    },
  };
}

function divider() {
  return {
    type: 'div',
    props: {
      style: {
        width: 1,
        height: 52,
        background: 'rgba(139, 170, 230, 0.26)',
      },
      children: '',
    },
  };
}

export function renderCardTemplate(data, type = 'App') {
  const label = String(type || 'App').toUpperCase();
  const accent = data.accentColor || BRAND.blue;
  const secondary = data.secondaryColor || BRAND.violet;

  const title = truncate(data.title || 'Miyomi', 36);
  const description = truncate(data.description || 'Discover apps, extensions, guides and community resources.', 75);
  const pageUrl = truncate(data.pageUrl || 'miyomi.app', 42);

  const isGuide = label === 'GUIDE';
  const isExtension = label === 'EXTENSION';

  let stat3Label = 'Downloads';
  let stat3Value = formatNumber(data.downloadCount);
  let stat3Color = '#ffb13d';
  let stat3Icon = DownloadIcon(stat3Color);

  if (isGuide) {
    stat3Label = 'Type';
    stat3Value = 'Guide';
    stat3Icon = AppTypeIcon(stat3Color);
  } else if (isExtension) {
    stat3Label = 'Language';
    stat3Value = getLangName(data.language);
    stat3Icon = GlobeIcon(stat3Color);
  }

  const likes = formatNumber(data.likesCount);
  const updated = formatDate(data.updatedAt);
  const author = truncate(data.author || 'Community', 18);

  let stats = [];

  if (isGuide) {
    stats = [
      { label: 'Category', value: data.category || 'General', color: secondary, icon: AppTypeIcon(secondary) },
      { label: 'Updated', value: updated, color: accent, icon: CalendarIcon(accent) },
      { label: 'Author', value: author, color: secondary, icon: AvatarIcon(secondary) }
    ];
  } else {
    stats = [
      { label: 'Likes', value: likes, color: secondary, icon: HeartIcon(secondary) },
      { label: 'Updated', value: updated, color: accent, icon: CalendarIcon(accent) },
      { label: stat3Label, value: stat3Value, color: stat3Color, icon: stat3Icon },
      { label: 'Author', value: author, color: secondary, icon: AvatarIcon(secondary) }
    ];
  }

  const logoSrc = data.logoUrl;
  const mascotSrc = data.mascotUrl;
  const iconUrl = data.iconUrl;

  return {
    type: 'div',
    props: {
      style: {
        width: `${W}px`,
        height: `${H}px`,
        position: 'relative',
        display: 'flex',
        overflow: 'hidden',
        fontFamily: 'Inter',
        color: BRAND.text,
        background: `linear-gradient(135deg, ${BRAND.bg0} 0%, ${BRAND.bg1} 52%, ${darkAccent(accent)} 100%)`,
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(3,12,27,0.92) 0%, rgba(5,18,38,0.82) 48%, rgba(6,28,56,0.72) 100%)',
            },
            children: '',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              right: -40,
              top: -20,
              width: 550,
              height: 650,
              opacity: 0.18,
              backgroundImage: `radial-gradient(circle, ${accent} 1.5px, transparent 1.5px)`,
              backgroundSize: '16px 16px',
            },
            children: '',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              right: 0,
              top: 0,
              width: 620,
              height: 630,
              opacity: 0.13,
              background: `linear-gradient(135deg, transparent 0%, ${hexToRgba(accent, 0.22)} 100%)`,
            },
            children: '',
          },
        },
        mascotSrc
          ? {
            type: 'img',
            props: {
              src: mascotSrc,
              style: {
                position: 'absolute',
                right: 38,
                bottom: 58,
                width: 470,
                height: 520,
                objectFit: 'contain',
                opacity: 0.26,
              },
            },
          }
          : null,
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              left: 16,
              top: 16,
              width: 1168,
              height: 598,
              borderRadius: 24,
              border: `2px solid ${hexToRgba(accent, 0.72)}`,
            },
            children: '',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              left: 22,
              top: 22,
              width: 1156,
              height: 586,
              borderRadius: 20,
              border: `1px solid ${hexToRgba(secondary, 0.18)}`,
            },
            children: '',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              left: 52,
              top: 50,
              display: 'flex',
              alignItems: 'center',
              gap: 22,
            },
            children: [
              logoSrc
                ? {
                  type: 'img',
                  props: {
                    src: logoSrc,
                    style: {
                      width: 84,
                      height: 84,
                      borderRadius: 22,
                      objectFit: 'cover',
                    },
                  },
                }
                : null,
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                  },
                  children: [
                    hText('Miyomi', {
                      fontSize: 52,
                      fontWeight: 850,
                      lineHeight: 1,
                      letterSpacing: '-0.03em',
                      color: '#ffffff',
                    }),
                    hText('Your one-stop hub for apps, extensions and more!', {
                      marginTop: 10,
                      fontSize: 20,
                      fontWeight: 600,
                      color: accent,
                      lineHeight: 1,
                    }),
                  ],
                },
              },
            ].filter(Boolean),
          },
        },
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 66,
              right: 76,
              padding: '10px 18px',
              borderRadius: 12,
              color: '#ffffff',
              background: `linear-gradient(90deg, ${accent}, ${secondary})`,
              boxShadow: `0 0 24px ${hexToRgba(accent, 0.25)}`,
              fontSize: 22,
              fontWeight: 850,
              letterSpacing: '0.12em',
            },
            children: label,
          },
        },
        iconUrl
          ? {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                left: 78,
                top: 205,
                width: 205,
                height: 205,
                borderRadius: 42,
                background: 'rgba(255,255,255,0.07)',
                border: `1px solid ${hexToRgba(accent, 0.32)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 24px 58px rgba(0,0,0,0.38), 0 0 40px ${hexToRgba(accent, 0.16)}`,
              },
              children: {
                type: 'img',
                props: {
                  src: iconUrl,
                  style: {
                    width: 180,
                    height: 180,
                    borderRadius: 36,
                    objectFit: 'cover',
                  },
                },
              },
            },
          }
          : null,
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              left: iconUrl ? 330 : 74,
              top: 214,
              width: iconUrl ? 610 : 780,
              display: 'flex',
              flexDirection: 'column',
            },
            children: [
              hText(title, {
                fontSize: title.length > 24 ? 62 : 72,
                fontWeight: 850,
                lineHeight: 1.04,
                letterSpacing: '-0.04em',
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: iconUrl ? 610 : 780,
              }),
              {
                type: 'div',
                props: {
                  style: {
                    width: 290,
                    height: 5,
                    borderRadius: 999,
                    marginTop: 18,
                    background: `linear-gradient(90deg, ${accent}, ${secondary})`,
                  },
                  children: '',
                },
              },
              hText(description, {
                marginTop: 22,
                fontSize: 30,
                lineHeight: 1.28,
                color: BRAND.muted,
                width: iconUrl ? 610 : 720,
                height: 77,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }),
              {
                type: 'div',
                props: {
                  style: {
                    marginTop: 24,
                    alignSelf: 'flex-start',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 18px',
                    borderRadius: 14,
                    border: `1px solid ${hexToRgba(accent, 0.36)}`,
                    background: 'rgba(4, 14, 32, 0.48)',
                    maxWidth: 610,
                  },
                  children: [
                    hText('↗', {
                      color: accent,
                      fontSize: 26,
                      fontWeight: 800,
                      lineHeight: 1,
                    }),
                    hText(pageUrl, {
                      color: '#72b9ff',
                      fontSize: 24,
                      fontWeight: 700,
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                    }),
                  ],
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              left: 52,
              right: 52,
              bottom: 36,
              height: 92,
              borderRadius: 22,
              border: `1px solid ${hexToRgba(accent, 0.32)}`,
              background: 'rgba(5, 17, 39, 0.72)',
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
            },
            children: stats.map((stat, i) => [
              statBox(stat),
              i < stats.length - 1 ? divider() : null
            ]).flat().filter(Boolean),
          },
        },
      ].filter(Boolean),
    },
  };
}
