export async function extractColorFromImage(imageUrl: string): Promise<string | null> {
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
                ctx.drawImage(imgEl, 0, 0, imgEl.naturalWidth, imgEl.naturalHeight);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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

                if (count > 0) {
                    r = Math.floor(r / count);
                    g = Math.floor(g / count);
                    b = Math.floor(b / count);
                    const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
                    console.log("Successfully extracted color directly from DOM image element:", hex);
                    return hex;
                }
            }
        } catch (e) {
            console.warn("Direct DOM color extraction failed, falling back to URL fetch.", e);
        }
    }

    const tryExtract = (url: string, isFallback: boolean): Promise<string | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            
            let finalUrl = url;
            if (url && !url.startsWith("data:") && !isFallback) {
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
                ctx.drawImage(img, 0, 0, img.width, img.height);

                try {
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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

                    if (count === 0) return resolve(null);

                    r = Math.floor(r / count);
                    g = Math.floor(g / count);
                    b = Math.floor(b / count);

                    const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
                    resolve(hex);
                } catch (e) {
                    console.error("Error extracting color", e);
                    resolve(null);
                }
            };

            img.onerror = () => {
                resolve(null);
            };
        });
    };

    // Try direct extraction only
    return await tryExtract(imageUrl, false);
}
