import type { Metadata } from "next";
import {
  Bebas_Neue,
  Anton,
  Playfair_Display,
  Inter,
  Major_Mono_Display,
  Space_Mono,
  Bungee,
  Caveat,
} from "next/font/google";
import "./globals.css";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "block",
});

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "block",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "block",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "block",
});

const majorMono = Major_Mono_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-major-mono",
  display: "block",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "block",
});

const bungee = Bungee({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bungee",
  display: "block",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "block",
});

export const metadata: Metadata = {
  title: "All of the Lights",
  description: "Rapid-fire title-card flash sequence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVars = [
    bebas.variable,
    anton.variable,
    playfair.variable,
    inter.variable,
    majorMono.variable,
    spaceMono.variable,
    bungee.variable,
    caveat.variable,
  ].join(" ");

  return (
    <html lang="en" className={`${fontVars} h-full antialiased`}>
      <body className="min-h-full bg-black text-white overflow-hidden">
        {children}
      </body>
    </html>
  );
}
