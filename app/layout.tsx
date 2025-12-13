import { Providers } from "./providers";
import Navbar from "./components/navbar";
import "./globals.css";

export const metadata = {
  title: "Satvik's Group",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
