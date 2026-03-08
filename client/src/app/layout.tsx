import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { WalletProvider } from "@/context/WalletContext";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "gSwap — Universal Liquidity on Polkadot Hub",
  description: "DEX on Polkadot Hub EVM with 3D pool visualization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} antialiased`}>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
