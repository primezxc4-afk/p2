import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/ui/theme-provider";
import Provider from "./provider";
import Script from "next/script";
import SandboxGuard from "@/components/ui/sandboxGuard";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZXCSTREAM EMBED",
  description:
    "Dive into endless hours of free streaming of Movies & TV Shows. A free, easy-to-embed player you can drop into any website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProduction = process.env.NODE_ENV === "production";
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        figtree.variable,
      )}
    >
      <head>
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-X84FLTN1EC"
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-X84FLTN1EC');
            `,
          }}
        />
        {isProduction && (
          <Script
            src="https://cdn.jsdelivr.net/npm/disable-devtool@latest"
            strategy="beforeInteractive"
            disable-devtool-auto=""
          />
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Provider>
            <SandboxGuard>
            {children}
            </SandboxGuard>
          </Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
