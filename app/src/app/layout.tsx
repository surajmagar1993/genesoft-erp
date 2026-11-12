import { appUrl } from "@/lib/app-url"
import { indexingAllowed } from "@/lib/indexing"
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";

// No blanket "force-dynamic" here: the public website is built once and refreshed on publish
// (and hourly); the app and Super Admin layouts set it for themselves.

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: "Genesoft ERP & CRM",
  description: "Multi-platform SaaS ERP & CRM by Genesoft Infotech",
  applicationName: "Genesoft ERP",
  authors: [{ name: "Genesoft Infotech", url: "https://genesoftinfotech.com" }],
  openGraph: {
    siteName: "Genesoft ERP",
    title: "Genesoft ERP & CRM",
    description: "Multi-platform SaaS ERP & CRM by Genesoft Infotech",
    type: "website",
  },
  icons: {
    icon: "/favicon.png",
  },
  // Test and preview copies ask search engines not to index them (see indexingAllowed)
  ...(indexingAllowed() ? {} : { robots: { index: false, follow: false } }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <NextTopLoader
          color="#10b981"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 12px #10b981,0 0 6px #10b981"
          zIndex={99999}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
          </TooltipProvider>
          {/* Shows every toast() message (success/error) across the app */}
          <Toaster richColors closeButton position="top-right" theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}

