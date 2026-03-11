"use client";

import { authClient } from "@/lib/auth-client";
import {
    redirectToCheckout,
    type TBillingClientPlanId,
} from "@/lib/billing-client";
import { normalizeSubscriptionTier } from "@/lib/entitlements";
import { useTRPC } from "@/trpc/client";
import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type TPlanId = "free" | "pro" | "lifetime";

const plans = [
    {
        id: "free",
        name: "Free",
        price: "$0",
        period: "forever",
        description: "Perfect for getting started with habit tracking",
        features: [
            "Up to 5 habits",
            "Binary and goal-based habits",
            "7-day history",
            "Guided onboarding and recovery prompts",
            "Reflection notes",
        ],
        cta: "Get Started",
        popular: false,
    },
    {
        id: "pro",
        name: "Pro",
        price: "$9",
        period: "per month",
        description: "For serious habit builders who want more",
        features: [
            "Unlimited habits",
            "Actionable analytics insights",
            "Unlimited history",
            "Email reminders",
            "Habit notes and weekly review cues",
            "Export data",
            "Priority support",
        ],
        cta: "Start Free Trial",
        popular: true,
    },
    {
        id: "lifetime",
        name: "Lifetime",
        price: "$99",
        period: "one-time",
        description: "Pay once, track habits forever",
        features: [
            "Everything in Pro",
            "Lifetime access",
            "All future updates",
            "Premium templates and guided programs",
            "Dedicated support",
            "Early access to features",
        ],
        cta: "Get Lifetime Access",
        popular: false,
    },
] as const satisfies ReadonlyArray<{
    id: TPlanId;
    name: string;
    price: string;
    period: string;
    description: string;
    features: readonly string[];
    cta: string;
    popular: boolean;
}>;

export function Pricing() {
    const trpc = useTRPC();
    const { data: session } = authClient.useSession();
    const router = useRouter();
    const [loadingPlan, setLoadingPlan] = useState<TPlanId | null>(null);

    const { data: billingStatus } = useQuery({
        ...trpc.billing.getStatus.queryOptions(),
        enabled: Boolean(session?.user),
        retry: false,
    });

    const currentTier = normalizeSubscriptionTier(
        billingStatus?.subscriptionTier ??
            (session?.user as { subscriptionTier?: string | null } | undefined)
                ?.subscriptionTier,
    );

    const handlePlanSelect = async (planId: TPlanId) => {
        if (planId === "free") {
            if (session?.user) {
                router.push("/habits");
            } else {
                router.push("/sign-up");
            }
            return;
        }

        if (!session?.user) {
            router.push("/sign-up");
            return;
        }

        if (currentTier === planId || currentTier === "lifetime") {
            router.push("/habits");
            return;
        }

        setLoadingPlan(planId);

        try {
            await redirectToCheckout(planId as TBillingClientPlanId);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Unable to start checkout right now.",
            );
        } finally {
            setLoadingPlan(null);
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
                        Start for free, upgrade when you're ready. No credit
                        card required.
                    </p>
                </div>

                {/* Pricing cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <Card
                            key={plan.id}
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
                                    variant={
                                        plan.popular ? "solid" : "bordered"
                                    }
                                    className="w-full font-semibold"
                                    size="lg"
                                    isLoading={loadingPlan === plan.id}
                                    onPress={() => handlePlanSelect(plan.id)}
                                >
                                    {currentTier === plan.id
                                        ? "Current Plan"
                                        : currentTier === "lifetime" &&
                                            plan.id !== "free"
                                          ? "Included in Lifetime"
                                          : plan.cta}
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
