import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AudioController } from "@/components/AudioController";
import { VolumeControl } from "@/components/ui/VolumeControl";

export const metadata: Metadata = {
  title: "Seagrass Stories",
  description:
    "Dive in, plant seagrass, and restore a shared underwater meadow together.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#06222e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">
        <AudioController />
        {children}
        <VolumeControl />
      </body>
    </html>
  );
}
