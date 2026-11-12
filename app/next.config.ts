import type { NextConfig } from "next";

/**
 * Content-Security-Policy: what a page may load and where it may send data.
 * Scripts only from this site, Razorpay checkout and Cloudflare Turnstile
 * ('unsafe-inline' is needed for Next.js's own inline scripts; 'unsafe-eval'
 * only in local development). Connections only to this site, Supabase and the
 * same two services. No plugins, no <base> tricks, forms post only here.
 */
const isDev = process.env.NODE_ENV !== "production"
const supabase = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin
  } catch {
    return "https://*.supabase.co"
  }
})()
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://*.razorpay.com https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabase.replace("https://", "wss://")} https://*.razorpay.com https://challenges.cloudflare.com`,
  "frame-src 'self' https://*.razorpay.com https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Camera stays allowed for the in-app barcode scanner
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // The ERP product pages moved under /erp when the company website took over "/",
  // and the old static genesoftinfotech.com pages (*.html) point to their new homes
  async redirects() {
    return [
      { source: "/pricing", destination: "/erp/pricing", permanent: true },
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/about.html", destination: "/about", permanent: true },
      { source: "/services.html", destination: "/services", permanent: true },
      { source: "/contact.html", destination: "/contact", permanent: true },
      { source: "/careers.html", destination: "/careers", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Everything except the public web forms (which customers embed in iframes) refuses framing
      {
        source: "/:path((?!forms/).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: `${csp}; frame-ancestors 'self'` },
        ],
      },
    ];
  },
};

export default nextConfig;
