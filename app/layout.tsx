// app/layout.tsx
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { Inter } from "next/font/google";
import { SocketProvider } from "./context/SocketContext";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata = {
  title: "OneVika",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
        <head>
        <Script
          src="https://cdn.metered.ca/sdk/video/1.4.5/sdk.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ClientLayout>
           <SocketProvider>
          {children}
          </SocketProvider>
        </ClientLayout>
      </body>
    </html>
  );
}
