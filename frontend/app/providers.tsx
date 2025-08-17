"use client";

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { AuthProvider } from "@/contexts/auth-context";
import { NotificationProvider } from "@/contexts/notification-context";
import { QRCodesProvider } from "@/contexts/qr-codes-context";
import { DashboardDataProvider } from "@/contexts/dashboard-data-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        storageKey="app-theme"
        themes={["light", "dark"]}
      >
        <AuthProvider>
          <DashboardDataProvider>
            <QRCodesProvider>
              <NotificationProvider>
                {children}
              </NotificationProvider>
            </QRCodesProvider>
          </DashboardDataProvider>
        </AuthProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
