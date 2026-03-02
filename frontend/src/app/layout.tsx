import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "K8s CronJob Manager",
  description: "Visualizza e gestisci i CronJob di Kubernetes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}>
        <Providers>
          <header className="border-b border-border px-6 py-4 flex items-center gap-3">
            <span className="text-2xl">☸️</span>
            <div>
              <h1 className="text-lg font-semibold leading-none">K8s CronJob Manager</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Kubernetes · namespace: default</p>
            </div>
          </header>
          <main className="p-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
