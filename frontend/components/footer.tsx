
import { Link } from "@heroui/link";

const Footer = () => {
  return (
    <footer className="w-full max-w-screen-xl mx-auto px-4 py-28 gap-5 md:px-8 flex flex-col justify-between items-center">
      <h5 className="font-medium bg-gradient-to-b from-foreground to-muted-foreground text-transparent bg-clip-text">
        SaaS URL — Shorten Links. Track Clicks. Grow Faster.
      </h5>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} SaaS URL</span>
        <span>•</span>
        <Link href="#pricing">Pricing</Link>
        <span>•</span>
        <Link href="#testimonials">Testimonials</Link>
        <span>•</span>
        <Link href="/login">Login</Link>
      </div>
    </footer>
  );
};

export default Footer;
