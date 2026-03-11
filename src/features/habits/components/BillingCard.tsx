"use client";

import {
    redirectToBillingPortal,
    redirectToCheckout,
    type TBillingClientPlanId,
} from "@/lib/billing-client";
import { useTRPC } from "@/trpc/client";
import { Button, Chip } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2Icon, CreditCardIcon, SparklesIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function getTierLabel(tier: "free" | "pro" | "lifetime") {
    switch (tier) {
        case "pro":
            return "Pro";
        case "lifetime":
            return "Lifetime";
        default:
            return "Free";
    }
}

export const BillingCard = () => {
    const trpc = useTRPC();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [loadingAction, setLoadingAction] = useState<
        "portal" | TBillingClientPlanId | null
    >(null);
    const [dismissedSuccess, setDismissedSuccess] = useState(false);

    const { data: billing } = useQuery(trpc.billing.getStatus.queryOptions());

    const checkoutSuccess =
        searchParams.get("checkout") === "success" && !dismissedSuccess;

    const subscriptionEndsAt = useMemo(() => {
        if (!billing?.subscriptionEndsAt) {
            return null;
        }

        return format(new Date(billing.subscriptionEndsAt), "MMMM d, yyyy");
    }, [billing?.subscriptionEndsAt]);

    const clearCheckoutFlag = () => {
        const nextSearchParams = new URLSearchParams(searchParams.toString());
        nextSearchParams.delete("checkout");

        const nextUrl = nextSearchParams.toString()
            ? `${pathname}?${nextSearchParams.toString()}`
            : pathname;

        router.replace(nextUrl, { scroll: false });
        setDismissedSuccess(true);
    };

    const handleUpgrade = async (plan: TBillingClientPlanId) => {
        setLoadingAction(plan);
        try {
            await redirectToCheckout(plan);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Unable to start checkout right now.",
            );
            setLoadingAction(null);
        }
    };

    const handleManageBilling = async () => {
        setLoadingAction("portal");
        try {
            await redirectToBillingPortal();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Unable to open billing settings right now.",
            );
            setLoadingAction(null);
        }
    };

    if (!billing) {
        return null;
    }

    return (
        <div className="space-y-3">
            {checkoutSuccess ? (
                <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                    <div className="flex items-start gap-3">
                        <CheckCircle2Icon
                            size={18}
                            className="mt-0.5 shrink-0 text-emerald-300"
                        />
                        <div>
                            <p className="text-sm font-semibold text-emerald-300">
                                Checkout completed.
                            </p>
                            <p className="text-xs text-emerald-200/80">
                                Your plan will refresh automatically as Stripe webhooks arrive.
                            </p>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        variant="light"
                        className="text-emerald-200"
                        onPress={clearCheckoutFlag}
                    >
                        Dismiss
                    </Button>
                </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Chip size="sm" color="primary" variant="flat">
                                {getTierLabel(billing.subscriptionTier)} Plan
                            </Chip>
                            {billing.subscriptionTier === "lifetime" ? (
                                <Chip size="sm" color="success" variant="flat">
                                    Premium Unlocked
                                </Chip>
                            ) : null}
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                {billing.subscriptionTier === "free"
                                    ? "Unlock unlimited habits, longer analytics, and exports."
                                    : billing.subscriptionTier === "pro"
                                      ? "Your Pro subscription is active."
                                      : "You own Lifetime access to Habitly."}
                            </p>
                            <p className="text-xs text-foreground-400">
                                {billing.subscriptionTier === "pro" && subscriptionEndsAt
                                    ? `Renews on ${subscriptionEndsAt}.`
                                    : billing.subscriptionTier === "lifetime"
                                      ? "No recurring billing required."
                                      : "Free includes 5 active habits and 7-day analytics."}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {billing.subscriptionTier === "free" ? (
                            <>
                                <Button
                                    color="primary"
                                    startContent={<SparklesIcon size={16} />}
                                    isLoading={loadingAction === "pro"}
                                    onPress={() => handleUpgrade("pro")}
                                >
                                    Upgrade to Pro
                                </Button>
                                <Button
                                    variant="flat"
                                    startContent={<CreditCardIcon size={16} />}
                                    isLoading={loadingAction === "lifetime"}
                                    onPress={() => handleUpgrade("lifetime")}
                                >
                                    Get Lifetime
                                </Button>
                            </>
                        ) : null}

                        {billing.subscriptionTier === "pro" ? (
                            <>
                                <Button
                                    variant="flat"
                                    startContent={<CreditCardIcon size={16} />}
                                    isLoading={loadingAction === "portal"}
                                    onPress={handleManageBilling}
                                >
                                    Manage Billing
                                </Button>
                                <Button
                                    color="primary"
                                    startContent={<SparklesIcon size={16} />}
                                    isLoading={loadingAction === "lifetime"}
                                    onPress={() => handleUpgrade("lifetime")}
                                >
                                    Upgrade to Lifetime
                                </Button>
                            </>
                        ) : null}

                        {billing.subscriptionTier === "lifetime" ? (
                            <Button
                                variant="flat"
                                onPress={() => router.push("/analytics")}
                            >
                                Open Analytics
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};