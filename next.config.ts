import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

// Parte de la política que no puede romper nada y se aplica ya: nadie puede incrustar el sitio,
// cambiar la base de los enlaces ni enviar formularios a otro dominio.
const enforcedCsp = "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";
// Política completa en modo informe: el navegador avisa en la consola qué bloquearía, sin bloquear.
// Cuando no queden avisos se pasa a obligatoria (con nonce para los scripts).
const reportOnlyCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src https://www.google.com",
  "worker-src 'self'",
  "manifest-src 'self'",
].join("; ");
securityHeaders.push({ key: "Content-Security-Policy", value: enforcedCsp }, { key: "Content-Security-Policy-Report-Only", value: reportOnlyCsp });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,
  images: {
    // 90 solo para la foto profesional de la portada; el resto usa 75 (el valor por defecto).
    qualities: [75, 90],
    remotePatterns: [
      // Archivos públicos del bucket de Supabase Storage (fotos de perfil, portadas de materiales).
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
