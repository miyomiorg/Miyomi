function calculateDominantColor(ctx: CanvasRenderingContext2D, width: number, height: number): string | null {
    try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const length = data.length;
        let r = 0, g = 0, b = 0, count = 0;

        for (let i = 0; i < length; i += 40) {
            if (data[i + 3] < 200) continue;

            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
        }

        if (count === 0) return null;

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    } catch (e) {
        console.warn("Color calculation failed (likely CORS taint):", e);
        return null;
    }
}

export async function extractColorFromImage(imageUrl: string): Promise<string | null> {
    if (!imageUrl) return null;

    // 1. Try to find the image in the DOM first to avoid re-fetching
    const imgEl = Array.from(document.querySelectorAll('img')).find(
        img => img.src === imageUrl || img.getAttribute('src') === imageUrl
    ) as HTMLImageElement | undefined;

    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
        try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (ctx) {
                canvas.width = imgEl.naturalWidth;
                canvas.height = imgEl.naturalHeight;
                ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

                const hex = calculateDominantColor(ctx, canvas.width, canvas.height);
                if (hex) return hex;
            }
        } catch (e) {
        }
    }

    // 2. Fallback to fetching the image directly (or via proxy)
    const tryExtract = (url: string, useProxy: boolean = false): Promise<string | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";

            let finalUrl = url;
            if (useProxy) {
                finalUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
            } else if (!url.startsWith("data:")) {
                finalUrl = url.includes("?")
                    ? `${url}&_cb=${Date.now()}`
                    : `${url}?_cb=${Date.now()}`;
            }

            img.src = finalUrl;

            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) return resolve(null);

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                resolve(calculateDominantColor(ctx, canvas.width, canvas.height));
            };

            img.onerror = () => resolve(null);
        });
    };

    let color = await tryExtract(imageUrl, false);

    // Fallback using CORS proxy if direct extraction fails (e.g. 302 redirects breaking CORS)
    if (!color && !imageUrl.startsWith('data:')) {
        console.warn("Direct URL fetch for color extraction failed. Trying proxy...");
        color = await tryExtract(imageUrl, true);
    }

    return color;
}
