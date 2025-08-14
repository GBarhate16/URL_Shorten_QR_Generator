"use client";
import { Button } from "@heroui/react";
import { useState } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";

export default function ThemeSwitcher() {
  const [svg, setSvg] = useState(<MoonIcon className="h-4 w-4" />);
  const { theme, setTheme, systemTheme } = useTheme();

  const handleClick = () => {
    const current = theme === "system" ? systemTheme : theme;
    if (current === "light") {
      setTheme("dark");
      setSvg(<MoonIcon className="h-4 w-4" />);
    } else {
      setTheme("light");
      setSvg(<SunIcon className="h-4 w-4" />);
    }
  };

  return (
    <Button isIconOnly size="sm" variant="flat" className="text-foreground" onPress={handleClick}>
      {svg}
    </Button>
  );
}
