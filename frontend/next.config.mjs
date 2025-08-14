/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@heroui/react",
      "@heroui/button",
      "@heroui/input",
      "@radix-ui/react-icons",
    ],
  },
};

export default nextConfig;
