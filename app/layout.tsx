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
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800;900&family=Marcellus&family=Share+Tech+Mono&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
        {children}
      </body>
    </html>
  );
}
