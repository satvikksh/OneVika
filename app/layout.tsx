import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from './theme-provider';
import SimpleNavbar from './components/navbar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// Note: Metadata must be exported from a server component
// So we define it separately
export const metadata: Metadata = {
  title: 'SatviksGroup - Imaginary Institute',
  description: 'Where imagination becomes reality and dreams take shape',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <>
            <SimpleNavbar
              isAuthenticated={false}
            />
            <main>{children}</main>
          </>
        </ThemeProvider>
      </body>
    </html>
  );
}