
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TenantThemeProvider } from "@/components/theme/TenantThemeProvider";
import { Toaster } from "sonner";
import { PermissionsProvider } from "@/lib/permission-context";
import { ConfirmProvider } from "@/lib/confirm-context";

export const metadata: Metadata = { title: "Porteiro", description: "Porteiro Platform" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head />
      <body className="min-h-screen antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TenantThemeProvider>
            <PermissionsProvider>
              <ConfirmProvider>
                {children}
              </ConfirmProvider>
            </PermissionsProvider>
          </TenantThemeProvider>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}