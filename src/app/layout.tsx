import type { Metadata } from "next";
import { Montserrat, Rubik } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-heading",
  weight: ["700", "800", "900"],
  subsets: ["latin"],
});

const rubik = Rubik({
  variable: "--font-body",
  weight: ["400", "500"],
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
      className={`${montserrat.variable} ${rubik.variable} h-full antialiased`}
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
            __html: `try{if(localStorage.getItem('theme')==='light'){document.documentElement.classList.add('light')}}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
