import type { Metadata } from 'next';
import '../globals.css';


export const metadata: Metadata = {
  title: 'Zavops CRM — AI-Powered Customer Management',
  description: 'AI-powered WhatsApp CRM with automated responses and agent handover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
          {children}
      </body>
    </html>
  );
}
