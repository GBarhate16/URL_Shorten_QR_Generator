"use client";

import { useCallback, useMemo, useEffect } from "react";
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
import ThemeSwitcher from "@/components/theme-switcher";
import {
  Home,
  PlusCircle,
  BarChart,
  LogOut,
  Crown,
  Users,
  Link as LinkIcon,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading, logout, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();

  const closeMobileSidebar = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(max-width: 768px)').matches) {
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
    const path = pathname.split('/').pop();
    if (path === 'overview' || path === 'dashboard' || !path) return 'overview';
    if (path === 'create-url') return 'create-url';
    if (path === 'urls') return 'urls';
    return 'overview';
  }, [pathname]);

  const pageTitle = useMemo(() => {
    switch (currentView) {
      case 'overview':
        return 'Dashboard';
      case 'create-url':
        return 'Create URL';
      case 'urls':
        return 'Your URLs';
      default:
        return 'Dashboard';
    }
  }, [currentView]);

  const userDisplayName = useMemo(() => user?.first_name || user?.username || 'User', [user]);

  const handleLogout = useCallback(() => {
    logout();
    closeMobileSidebar();
    router.replace("/login");
  }, [logout, router, closeMobileSidebar]);

  if (loading || (!isAuthenticated && typeof window !== 'undefined')) {
    return null; // prevent restricted page flash
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader>
          <NextLink href="/" className="flex items-center gap-2 font-semibold" onClick={closeMobileSidebar}>
            <LinkIcon className="h-6 w-6" />
            <span>URL Shortener</span>
          </NextLink>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={currentView === 'overview'} asChild>
                  <NextLink href="/dashboard/overview" prefetch={true} onClick={closeMobileSidebar}>
                    <Home />
                    <span>Dashboard</span>
                  </NextLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={currentView === 'create-url'} asChild>
                  <NextLink href="/dashboard/create-url" prefetch={true} onClick={closeMobileSidebar}>
                    <PlusCircle />
                    <span>Create URL</span>
                  </NextLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={currentView === 'urls'} asChild>
                  <NextLink href="/dashboard/urls" prefetch={true} onClick={closeMobileSidebar}>
                    <BarChart />
                    <span>Your URLs</span>
                  </NextLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                      <NextLink href="/api/users/admin/dashboard/" target="_blank" onClick={closeMobileSidebar}>
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
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="sticky top-0 z-30 flex min-h-14 items-center gap-4 border-b bg-background px-4 py-2 sm:static sm:border-0 sm:px-6">
          <SidebarTrigger className="sm:hidden text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
          <p className="hidden sm:block text-muted-foreground">
            Welcome back, {userDisplayName}!
            {isAdmin && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                <Crown className="h-3 w-3" />
                Admin
              </span>
            )}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitcher />
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {unreadCount} new notification{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
