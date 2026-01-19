// app/layout.tsx
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { Inter } from "next/font/google";
import { SocketProvider } from "./context/SocketContext";

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
