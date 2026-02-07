import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VestibulaRe - Alertas de Vestibulares',
  description:
    'Nunca mais perca uma data importante de vestibular. Receba alertas automáticos por email, SMS e WhatsApp sobre ENEM, ProUni, FIES, FUVEST e muito mais.',
  keywords: 'vestibular, enem, prouni, fies, alertas, inscrição, prova, resultado',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
