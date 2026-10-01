import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Proz Saúde", description: "Prontuário eletrônico hospitalar" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
