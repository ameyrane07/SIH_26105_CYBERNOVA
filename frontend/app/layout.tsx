import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CyberNova | Enterprise Cyber Risk Quantification',
  description: 'Actuarial OpenFAIR & MILP Knapsack Capital Optimization Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-[#070b12] text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}