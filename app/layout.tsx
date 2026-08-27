import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Toaster } from 'sonner';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'D-Pay | Premium POS',
  description: 'Ultra-Premium Point of Sale System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-background text-foreground antialiased selection:bg-indigo-500/30 selection:text-indigo-200`}>
        <div className="flex h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden relative">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth will-change-scroll">
              <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
                {children}
              </div>
            </main>
          </div>
        </div>
        <Toaster theme="dark" position="bottom-right" className="!bg-slate-900 !border-slate-800 !text-white" />
      </body>
    </html>

  );
}
