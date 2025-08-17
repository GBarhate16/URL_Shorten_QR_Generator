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
import { safeMap } from "@/lib/safe-arrays";

export default function NavBar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();

  const menuItems = [
    { name: "Pricing", href: "#pricing" },
    { name: "Testimonials", href: "#testimonials" },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      <Navbar
        isBlurred={false}
        maxWidth="xl"
        className="backdrop-blur supports-[backdrop-filter]:bg-background/70"
      >
        <NavbarContent className="sm:hidden" justify="start">
          <NavbarMenuToggle />
        </NavbarContent>
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
        <NavbarContent className="sm:hidden" justify="end">
          {!isAuthenticated && (
            <NavbarItem>
              <Button as={NextLink} href="/signup" color="primary" size="sm">
                Get Started
              </Button>
            </NavbarItem>
          )}
        </NavbarContent>
        <NavbarContent className="hidden sm:flex gap-10" justify="center">
          <NavbarBrand>
            <NextLink
              href="/"
              className="font-light tracking-tighter text-3xl md:text-4xl flex gap-3 justify-center items-center"
            >
              SaaS 
            </NextLink>
          </NavbarBrand>
          <NavbarItem>
            {/* <Button
              as={NextLink}
              href="#pricing"
              variant="light"
              size="md"
              className="text-base md:text-lg font-medium"
            >
              Pricing
            </Button> */}
          </NavbarItem>
          {/* <NavbarItem>
            <Button
              as={NextLink}
              href="#testimonials"
              variant="light"
              size="md"
              className="text-base md:text-lg font-medium"
            >
              Testimonials
            </Button>
          </NavbarItem> */}
        </NavbarContent>
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
                    <DropdownItem key="logout" color="danger" onPress={handleLogout}>
                      Logout
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </NavbarItem>
            </>
          ) : (
            <NavbarItem className="hidden sm:flex">
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
        <NavbarMenu>
          {safeMap(menuItems, (item, index) => (
            <NavbarMenuItem key={`${item.name}-${index}`}>
              <NextLink
                className="w-full"
                href={item.href}
              >
                {item.name}
              </NextLink>
            </NavbarMenuItem>
          ))}
          {isAuthenticated && (
            <NavbarMenuItem>
              <NextLink
                className="w-full"
                href="/dashboard"
              >
                Dashboard
              </NextLink>
            </NavbarMenuItem>
          )}
        </NavbarMenu>
      </Navbar>
    </>
  );
}