import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GD Beauty — Fragrance, Skin, Colour, Body',
  description: 'GD Beauty — a Grasse maison making fragrance, skin, colour and body care in small batches.'
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Jost:wght@300;400;500;600&family=Pinyon+Script&display=swap" rel="stylesheet" />
        <noscript><style>{'.rise{opacity:1!important;transform:none!important}'}</style></noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
