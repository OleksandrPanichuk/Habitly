"use client";

import { Button } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/shared";
import { authClient } from "@/lib/auth-client";

export function Header() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const handleGetStarted = () => {
    if (session?.user) {
      router.push("/dashboard");
    } else {
      router.push("/sign-up");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-divider">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo />

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="#features"
              className="text-foreground-600 hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-foreground-600 hover:text-foreground transition-colors"
            >
              How it Works
            </Link>
            <Link
              href="#pricing"
              className="text-foreground-600 hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {!session?.user && !isPending && (
              <Button
                as={Link}
                href="/sign-in"
                variant="light"
                className="hidden sm:flex"
              >
                Sign In
              </Button>
            )}
            <Button
              color="primary"
              onPress={handleGetStarted}
              isLoading={isPending}
              className="font-semibold"
            >
              {session?.user ? "Dashboard" : "Get Started"}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
