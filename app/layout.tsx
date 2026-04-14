import './globals.css';
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Manrope, Space_Grotesk } from 'next/font/google';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });

export const metadata: Metadata = {
  title: 'LoanPro Admin',
  description: 'LoanPro admin control plane',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <html lang="en" className={`${manrope.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen antialiased">
        {publishableKey ? <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider> : children}
      </body>
    </html>
  );
}
