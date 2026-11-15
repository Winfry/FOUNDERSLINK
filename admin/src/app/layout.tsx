import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// The same type as the members' app: Inter Tight, light for big headings
// and numbers, regular for reading, medium for names and buttons.
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter-tight",
});

export const metadata: Metadata = {
  title: "FoundersLink Staff",
  description: "Platform administration for FoundersLink Kenya",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${interTight.variable} min-h-screen bg-background font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
