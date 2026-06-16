export function renderCardTemplate(data, type) {
  // Common Colors
  const bgSurface = '#111827';
  const brand = '#6366f1';
  const textPrimary = '#f9fafb';
  const textSecondary = '#9ca3af';

  const label = type.toUpperCase();
  const title = data.title;
  const description = data.description || '';
  const iconUrl = data.iconUrl;

  const metadataList = [];
  if (data.downloadCount) metadataList.push(`${data.downloadCount.toLocaleString()} Downloads`);
  if (data.likesCount) metadataList.push(`${data.likesCount.toLocaleString()} Likes`);
  if (data.updatedAt) metadataList.push(`Updated ${new Date(data.updatedAt).toLocaleDateString()}`);

  const metadataText = metadataList.join(' • ');

  // Satori expects a React-element-like object structure for JSX-like rendering
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        backgroundColor: bgSurface,
        padding: '60px',
        fontFamily: '"Inter"',
        color: textPrimary,
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          backgroundColor: brand,
                          color: '#fff',
                          padding: '6px 16px',
                          borderRadius: '8px',
                          fontSize: '24px',
                          fontWeight: 700,
                          letterSpacing: '2px',
                        },
                        children: label,
                      },
                    },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '24px',
                    fontWeight: 700,
                    color: textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: { color: brand, marginRight: '8px', fontSize: '32px' },
                        children: 'M',
                      }
                    },
                    'Miyomi'
                  ]
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '40px',
            },
            children: [
              iconUrl ? {
                type: 'img',
                props: {
                  src: iconUrl,
                  style: {
                    width: '180px',
                    height: '180px',
                    borderRadius: '40px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                  },
                },
              } : null,
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                  },
                  children: [
                    {
                      type: 'h1',
                      props: {
                        style: {
                          fontSize: '64px',
                          fontWeight: 800,
                          margin: '0 0 20px 0',
                          lineHeight: 1.1,
                        },
                        children: title,
                      },
                    },
                    {
                      type: 'p',
                      props: {
                        style: {
                          fontSize: '32px',
                          color: textSecondary,
                          margin: 0,
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        },
                        children: description,
                      },
                    },
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '2px solid rgba(255,255,255,0.1)',
              paddingTop: '30px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '24px',
                    color: textSecondary,
                    fontWeight: 500,
                  },
                  children: metadataText || 'miyomi.app',
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '24px',
                    color: textSecondary,
                    fontWeight: 500,
                  },
                  children: data.author ? `By ${data.author}` : 'Community Directory',
                },
              },
            ],
          },
        },
      ],
    },
  };
}
