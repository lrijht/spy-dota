import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spy Dota — Шпион по героям Dota 2",
  description: "Социальная игра с героями Dota 2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Rajdhani', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
