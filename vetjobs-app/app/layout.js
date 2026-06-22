import "./globals.css";
import { Outfit } from "next/font/google";
import { AppProvider } from "./providers";
import Shell from "@/components/Shell";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata = {
  title: "VetJobs NG — Verified jobs. Zero scams.",
  description: "Find real, scam-free Nigerian jobs and auto-apply with the right CV.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
