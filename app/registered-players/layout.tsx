import type { Metadata } from "next";
import { Barlow, JetBrains_Mono } from "next/font/google";
import "../globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Casino del Mar - Player Tracking System",
  description:
    "Transaction monitoring and compliance tracking for Casino del Mar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${barlow.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      {children}
    </div>
  );
}
