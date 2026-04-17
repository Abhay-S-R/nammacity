import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NammaCity AI",
  description: "Proactive city intelligence dashboard for Bengaluru — forecasting congestion, pollution, and infrastructure stress across city zones.",
  keywords: ["Bengaluru", "city intelligence", "traffic", "pollution", "AI", "dashboard"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0e17] text-slate-100 selection:bg-blue-500/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
