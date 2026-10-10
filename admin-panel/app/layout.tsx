import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { PermissionsProvider } from "@/lib/permission-context";
import { ConfirmProvider } from "@/lib/confirm-context";



export const metadata: Metadata = { title: "Porteiro" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head />
      {/*<body  className="antialiased bg-background text-foreground">*/}
      <body >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <PermissionsProvider>
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
          </PermissionsProvider>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}