import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'True-Connect | Social Network',
  description: 'Connect with friends and share moments on True-Connect',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: 'dark:bg-neutral-800 dark:text-white',
              duration: 3000,
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
