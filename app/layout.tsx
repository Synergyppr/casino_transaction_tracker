import type { Metadata } from "next";
import { Barlow, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { RoutePermissions } from "./components/RoutePermissions";
import { AppSessionManager } from "./components/AppSessionManager";

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
  description: "Transaction monitoring and compliance tracking for Casino del Mar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans
        max-sm:[&_main]:max-w-screen
        max-sm:[&_main_header]:flex-wrap max-sm:[&_main_header]:h-auto max-sm:[&_main_header]:min-h-12
        max-sm:[&_main_.flex.items-center.justify-between]:flex-wrap max-sm:[&_main_.flex.items-center.justify-between]:gap-3
        max-sm:[&_input]:max-w-full max-sm:[&_select]:max-w-full max-sm:[&_textarea]:max-w-full
        max-lg:[&_div:has(>table[data-mobile-stack])]:min-w-0
        max-lg:[&_div:has(>table[data-mobile-stack])]:max-w-full
        max-lg:[&_div:has(>table[data-mobile-stack])]:overflow-x-visible">
        <AppSessionManager />
        <RoutePermissions>{children}</RoutePermissions>
      </body>
    </html>
  );
}
