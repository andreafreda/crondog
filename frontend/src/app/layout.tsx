import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { RefreshProvider, RefreshSelector } from "@/lib/refresh-context";
import { NamespaceProvider } from "@/lib/namespace-context";
import { NamespaceSelector } from "@/lib/namespace-selector";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KronDog v0.99.1-SNAPSHOT",
  description: "KronDog - Kubernetes CronJob Manager",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}>
        <Providers>
          <NamespaceProvider>
            <RefreshProvider>
              <header className="border-b border-border px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🐶</span>
                  <div>
                    <h1 className="text-lg font-semibold leading-none flex items-center gap-2">
                      KronDog
                      <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">v0.99.1-SNAPSHOT</span>
                    </h1>
                    <NamespaceSelector />
                  </div>
                </div>
                <RefreshSelector />
              </header>
              <main className="p-6">{children}</main>
            </RefreshProvider>
          </NamespaceProvider>
        </Providers>
      </body>
    </html>
  );
}
