import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jogo do Bernardo - Clube de Futebol Idle',
  description: 'Jogo idle de clube de futebol para o Bernardo',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-sky-100 text-slate-900 select-none overflow-hidden touch-manipulation">
        {children}
      </body>
    </html>
  );
}
