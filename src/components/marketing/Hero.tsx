"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function Hero() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  const handleGetStarted = () => {
    if (session?.user) {
      router.push("/dashboard");
    } else {
      router.push("/sign-up");
    }
  };

  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-medium text-foreground-700">
              Build Better Habits Today
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
            Transform Your Life,{" "}
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              One Habit at a Time
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-foreground-600 max-w-3xl mx-auto">
            Track your daily habits, build lasting streaks, and visualize your
            progress with beautiful analytics. Start your journey to
            consistency.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              color="primary"
              className="font-semibold text-base px-8"
              onPress={handleGetStarted}
            >
              {session?.user ? "Go to Dashboard" : "Start Free"}
            </Button>
            <Button
              size="lg"
              variant="bordered"
              className="font-semibold text-base px-8"
              as="a"
              href="#features"
            >
              Learn More
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12">
            <div className="space-y-1">
              <div className="text-3xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                10K+
              </div>
              <div className="text-sm text-foreground-600">Active Users</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                1M+
              </div>
              <div className="text-sm text-foreground-600">Habits Tracked</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold bg-linaer-to-r from-primary to-secondary bg-clip-text text-transparent">
                98%
              </div>
              <div className="text-sm text-foreground-600">Success Rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
