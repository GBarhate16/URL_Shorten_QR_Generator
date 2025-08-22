"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import NextLink from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notification-context";
import { DashboardLoading } from "@/components/ui/dashboard-loading";
import DeleteAccountModal from "@/components/delete-account-modal";
import ThemeSwitcher from "@/components/theme-switcher";
import {
  Home,
  PlusCircle,
  BarChart,
  LogOut,
  Crown,
  Users,
  Link as LinkIcon,
  QrCode,
  Scan,
  Trash2,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading, logout, deleteAccount, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const closeMobileSidebar = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 768px)").matches) {
      const trigger = document.querySelector('[data-sidebar="trigger"]') as HTMLElement | null;
      trigger?.click();
    }
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  const currentView = useMemo(() => {
    const path = pathname.split("/").pop();
    if (path === "overview" || path === "dashboard" || !path) return "overview";
    if (path === "create-url") return "create-url";
    if (path === "urls") return "urls";
    if (path === "create-qr") return "create-qr";
    if (path === "qr-codes") return "qr-codes";
    if (path === "trash") return "trash";
    return "overview";
  }, [pathname]);

  const pageTitle = useMemo(() => {
    switch (currentView) {
      case "overview":
        return "Dashboard";
      case "create-url":
        return "Create URL";
      case "urls":
        return "Your URLs";
      case "create-qr":
        return "Create QR Code";
      case "qr-codes":
        return "Your QR Codes";
      case "trash":
        return "Trash";
      default:
        return "Dashboard";
    }
  }, [currentView]);

  const userDisplayName = useMemo(() => user?.first_name || user?.username || "User", [user]);

  const handleLogout = useCallback(() => {
    logout();
    closeMobileSidebar();
    router.replace("/login");
  }, [logout, router, closeMobileSidebar]);

  const handleDeleteAccount = useCallback(async () => {
    setIsDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const success = await deleteAccount();
    if (success) {
      closeMobileSidebar();
      router.replace("/");
    }
    return success;
  }, [deleteAccount, closeMobileSidebar, router]);

  const handleCloseDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  if (loading || (!isAuthenticated && typeof window !== "undefined")) {
    return null; // prevent restricted page flash
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar className="max-w-full overflow-x-hidden [&_*]:max-w-full">
        {/* Logo / Title */}
        <SidebarHeader>
          <NextLink
            href="/"
            className="flex items-center gap-2 font-semibold truncate"
            onClick={closeMobileSidebar}
          >
            <LinkIcon className="h-6 w-6 flex-shrink-0" />
            <span className="truncate">URL Shortener</span>
          </NextLink>
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={currentView === "overview"} asChild>
                  <NextLink href="/dashboard/overview" prefetch onClick={closeMobileSidebar}>
                    <Home />
                    <span>Dashboard</span>
                  </NextLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={currentView === "create-url"} asChild>
                  <NextLink href="/dashboard/create-url" prefetch onClick={closeMobileSidebar}>
                    <PlusCircle />
                    <span>Create URL</span>
                  </NextLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={currentView === "urls"} asChild>
                  <NextLink href="/dashboard/urls" prefetch onClick={closeMobileSidebar}>
                    <BarChart />
                    <span>Your URLs</span>
                  </NextLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* QR Code Section */}
              <SidebarSeparator />
              <SidebarGroupLabel>QR Codes</SidebarGroupLabel>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={currentView === "create-qr"} asChild>
                  <NextLink href="/dashboard/create-qr" prefetch onClick={closeMobileSidebar}>
                    <QrCode />
                    <span>Create QR Code</span>
                  </NextLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={currentView === "qr-codes"} asChild>
                  <NextLink href="/dashboard/qr-codes" prefetch onClick={closeMobileSidebar}>
                    <Scan />
                    <span>Your QR Codes</span>
                  </NextLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Trash Section */}
              <SidebarSeparator />
              <SidebarGroupLabel>Trash</SidebarGroupLabel>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={currentView === "trash"} asChild>
                  <NextLink href="/dashboard/trash" prefetch onClick={closeMobileSidebar}>
                    <Trash2 />
                    <span>Trash</span>
                  </NextLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Admin Section */}
              {isAdmin && (
                <>
                  <SidebarSeparator />
                  <SidebarGroupLabel>Admin</SidebarGroupLabel>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NextLink href="/admin" target="_blank" onClick={closeMobileSidebar}>
                        <Crown />
                        <span>Admin Panel</span>
                      </NextLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NextLink
                        href="/api/users/admin/dashboard/"
                        target="_blank"
                        onClick={closeMobileSidebar}
                      >
                        <Users />
                        <span>User Management</span>
                      </NextLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleDeleteAccount} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                <Trash2 />
                <span>Delete Account</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content */}
      <SidebarInset>
        <div className="sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b bg-background px-2 sm:px-4 py-2 sm:static sm:border-0">
          {/* Sidebar Toggle on Mobile */}
          <SidebarTrigger className="text-foreground sm:hidden" aria-label="Toggle sidebar" />

          {/* Title */}
          <h1 className="text-[clamp(16px,2vw,28px)] font-bold text-foreground truncate">
            {pageTitle}
          </h1>

          {/* Welcome Text */}
          <p className="hidden md:block text-[clamp(12px,1.5vw,18px)] text-muted-foreground truncate">
            Welcome back, {userDisplayName}!
            {isAdmin && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                <Crown className="h-3 w-3" />
                Admin
              </span>
            )}
          </p>

          {/* Actions */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ThemeSwitcher />
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200 truncate">
                {unreadCount} new notification{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Page Content */}
        <main className="w-full max-w-full overflow-x-hidden px-2 sm:px-4 lg:px-6 pb-6">
          <DashboardLoading>{children}</DashboardLoading>
        </main>
      </SidebarInset>
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteConfirm}
        username={user?.username || 'User'}
      />
    </SidebarProvider>
  );
}
