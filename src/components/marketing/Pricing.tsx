"use client";

import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started with habit tracking",
    features: [
      "Up to 5 habits",
      "Basic streak tracking",
      "7-day history",
      "Mobile responsive",
      "Email support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "per month",
    description: "For serious habit builders who want more",
    features: [
      "Unlimited habits",
      "Advanced analytics",
      "Unlimited history",
      "Custom habit colors",
      "Habit notes & reminders",
      "Export data",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Lifetime",
    price: "$99",
    period: "one-time",
    description: "Pay once, track habits forever",
    features: [
      "Everything in Pro",
      "Lifetime access",
      "All future updates",
      "Premium templates",
      "Dedicated support",
      "Early access to features",
    ],
    cta: "Get Lifetime Access",
    popular: false,
  },
];

export function Pricing() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  const handlePlanSelect = () => {
    if (session?.user) {
      router.push("/dashboard");
    } else {
      router.push("/sign-up");
    }
  };

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold">
            Choose Your{" "}
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              Perfect Plan
            </span>
          </h2>
          <p className="text-lg text-foreground-600 max-w-2xl mx-auto">
            Start for free, upgrade when you're ready. No credit card required.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative bg-content1 ${
                plan.popular
                  ? "border-2 border-primary shadow-lg shadow-primary/20 scale-105"
                  : "border border-divider"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-linear-to-r from-primary to-secondary text-white text-sm font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                </div>
              )}

              <CardHeader className="flex flex-col items-start p-6 pb-4">
                <h3 className="text-2xl font-bold text-foreground">
                  {plan.name}
                </h3>
                <p className="text-sm text-foreground-600 mt-2">
                  {plan.description}
                </p>
                <div className="mt-4">
                  <span className="text-5xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {plan.price}
                  </span>
                  <span className="text-foreground-600 ml-2">
                    {plan.period}
                  </span>
                </div>
              </CardHeader>

              <CardBody className="p-6 pt-0 space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-foreground-700"
                    >
                      <svg
                        aria-hidden="true"
                        className="w-5 h-5 text-primary mt-0.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  color={plan.popular ? "primary" : "default"}
                  variant={plan.popular ? "solid" : "bordered"}
                  className="w-full font-semibold"
                  size="lg"
                  onPress={handlePlanSelect}
                >
                  {plan.cta}
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Money-back guarantee */}
        <div className="text-center mt-12">
          <p className="text-foreground-600">
            All paid plans come with a{" "}
            <span className="text-primary font-semibold">
              30-day money-back guarantee
            </span>
            . No questions asked.
          </p>
        </div>
      </div>
    </section>
  );
}
