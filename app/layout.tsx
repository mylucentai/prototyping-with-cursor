/**
 * Root layout component that wraps all pages in the application.
 * This layout:
 * - Sets up Inter and JetBrains Mono fonts
 * - Configures metadata like title and favicon
 * - Provides the basic HTML structure
 * - Applies font variables to the entire app
 */

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./styles/globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RYAN's prototypes",
  description: "The home for all my prototypes",
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
