
import { Link } from "@heroui/link";

const Footer = () => {
  return (
    <footer className="w-full max-w-screen-xl mx-auto px-4 py-28 gap-5 md:px-8 flex flex-col justify-between items-center">
      <h5 className="font-medium bg-gradient-to-b from-foreground to-muted-foreground text-transparent bg-clip-text">
        Shortend — Shorten URLs. Generate QR Codes. Track &amp; Optimize.
      </h5>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} Shortend</span>
        <span>•</span>
        <Link href="/login">Login</Link>
        <span>•</span>
        <Link href="/signup">Sign Up</Link>
      </div>
    </footer>
  );
};

export default Footer;
