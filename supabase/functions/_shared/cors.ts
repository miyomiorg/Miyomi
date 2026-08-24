export const ALLOWED_ORIGINS = [
    "https://miyomi.app",
    "https://miyomi.pages.dev",
    "http://localhost:8080"
];

export function getCorsHeaders(req: Request) {
    const origin = req.headers.get("Origin") || "";
    
    let allowedOrigin = ALLOWED_ORIGINS[0];
    if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".miyomi.pages.dev")) {
        allowedOrigin = origin;
    }
    
    return {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    };
}
