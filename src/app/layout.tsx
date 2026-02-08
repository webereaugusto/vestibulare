import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ZapVest - Alertas de Vestibulares no WhatsApp',
  description:
    'Receba alertas de vestibulares direto no seu WhatsApp, SMS e email. ENEM, ProUni, FIES, FUVEST e muito mais. Nunca mais perca uma data importante.',
  keywords: 'vestibular, enem, prouni, fies, alertas, whatsapp, inscricao, prova, resultado, zapvest',
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
