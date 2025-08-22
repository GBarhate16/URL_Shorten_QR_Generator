"use client";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/navbar";
import NextLink from "next/link";
import { Button } from "@heroui/button";
import ThemeSwitcher from "@/components/theme-switcher";
import { useAuth } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notification-context";
import DeleteAccountModal from "@/components/delete-account-modal";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import {
  ChevronDownIcon,
} from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NavBar() {
  const { user, isAuthenticated, logout, deleteAccount } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleDeleteAccount = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    const success = await deleteAccount();
    if (success) {
      router.push('/');
    }
    return success;
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
  };

  return (
    <>
      <Navbar
        isBlurred={false}
        maxWidth="xl"
        className="backdrop-blur supports-[backdrop-filter]:bg-background/70"
      >
        {/* Mobile: left - menu toggle */}
        <NavbarContent className="sm:hidden" justify="start">
          <NavbarMenuToggle />
        </NavbarContent>

        {/* Mobile: center - brand */}
        <NavbarContent className="sm:hidden pr-3" justify="center">
          <NavbarBrand>
            <NextLink
              href="/"
              className="font-light tracking-tighter text-inherit text-xl"
            >
              SaaS 
            </NextLink>
          </NavbarBrand>
        </NavbarContent>

        {/* Mobile: right - auth buttons when logged out */}
        <NavbarContent className="sm:hidden" justify="end">
          {!isAuthenticated && (
            <NavbarItem className="flex gap-2">
              <Button as={NextLink} href="/login" variant="light" size="sm">
                Login
              </Button>
              <Button as={NextLink} href="/signup" color="primary" size="sm">
                Get Started
              </Button>
            </NavbarItem>
          )}
        </NavbarContent>

        {/* Desktop/tablet: brand and (placeholder center area if needed) */}
        <NavbarContent className="hidden sm:flex gap-10" justify="center">
          <NavbarBrand>
            <NextLink
              href="/"
              className="font-light tracking-tighter text-3xl md:text-4xl flex gap-3 justify-center items-center"
            >
              SaaS 
            </NextLink>
          </NavbarBrand>
        </NavbarContent>

        {/* Right side: auth controls */}
        <NavbarContent justify="end">
          {isAuthenticated ? (
            <>
              <NavbarItem className="hidden sm:flex">
                <Button
                  as={NextLink}
                  color="primary"
                  href="/dashboard"
                  variant="solid"
                  size="md"
                  className="text-sm md:text-base px-5 py-2"
                >
                  Dashboard
                </Button>
              </NavbarItem>
              <NavbarItem>
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      endContent={<ChevronDownIcon />}
                      variant="light"
                      size="md"
                      className="text-base md:text-lg relative"
                    >
                      {user?.first_name || user?.username}
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="User menu">
                    <DropdownItem key="profile">Profile</DropdownItem>
                    <DropdownItem key="settings">Settings</DropdownItem>
                    <DropdownItem key="delete-account" color="danger" onPress={handleDeleteAccount}>
                      Delete Account
                    </DropdownItem>
                    <DropdownItem key="logout" color="danger" onPress={handleLogout}>
                      Logout
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </NavbarItem>
            </>
          ) : (
            <NavbarItem className="hidden sm:flex gap-2">
              <Button
                as={NextLink}
                href="/login"
                variant="light"
                size="md"
                className="text-sm md:text-base px-4 py-2"
              >
                Login
              </Button>
              <Button
                as={NextLink}
                href="/signup"
                color="primary"
                variant="solid"
                size="md"
                className="text-sm md:text-base px-5 py-2"
              >
                Get Started
              </Button>
            </NavbarItem>
          )}
          <NavbarItem>
            <ThemeSwitcher />
          </NavbarItem>
        </NavbarContent>

        {/* Mobile menu content */}
        <NavbarMenu>
          {!isAuthenticated ? (
            <>
              <NavbarMenuItem>
                <NextLink className="w-full" href="/login">Login</NextLink>
              </NavbarMenuItem>
              <NavbarMenuItem>
                <NextLink className="w-full" href="/signup">Get Started</NextLink>
              </NavbarMenuItem>
            </>
          ) : (
            <NavbarMenuItem>
              <NextLink className="w-full" href="/dashboard">Dashboard</NextLink>
            </NavbarMenuItem>
          )}
        </NavbarMenu>
      </Navbar>
      
      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteConfirm}
        username={user?.username || 'User'}
      />
    </>
  );
}