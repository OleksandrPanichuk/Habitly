import Link from "next/link";

interface LogoProps {
  href?: string;
  className?: string;
}

export function Logo({ href = "/", className = "" }: LogoProps) {
  return (
    <Link href={href} className={`flex items-center space-x-2 ${className}`}>
      <div className="w-8 h-8 bg-linear-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-lg">H</span>
      </div>
      <span className="text-xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
        Habitly
      </span>
    </Link>
  );
}
