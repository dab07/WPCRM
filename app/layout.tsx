import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'WhatsApp CRM System',
  description: 'AI-powered WhatsApp CRM with automated responses and agent handover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
