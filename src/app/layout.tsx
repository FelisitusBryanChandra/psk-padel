import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import Script from "next/script";
import { AppNav } from "./AppNav";
import { PointerFX } from "./PointerFX";
import { WaveBackground } from "./WaveBackground";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-heading",
  weight: ["500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PSK Padel",
  description: "Padel Americano scoring and standings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // The theme-no-flash script below stamps `light` onto <html> before
      // hydration, so this one element is expected to differ from the server.
      suppressHydrationWarning
      className={`${barlowCondensed.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-ink font-body">
        <Script
          id="theme-no-flash"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='light'){document.documentElement.classList.add('light')}var a=localStorage.getItem('psk_accent_theme');if(a==='flame'||a==='ice'){document.documentElement.setAttribute('data-accent',a)}}catch(e){}`,
          }}
        />
        <WaveBackground />
        <PointerFX />
        {children}
        <AppNav />
      </body>
    </html>
  );
}
