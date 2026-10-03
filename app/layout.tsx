import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lando's 7th Birthday Party! 🎈",
  description: "Happy 7th Birthday Lando! Let the party begin!",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen" style={{ background: '#0a0a1a' }}>
        {children}
      </body>
    </html>
  );
}
