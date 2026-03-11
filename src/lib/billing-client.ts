"use client";

export type TBillingClientPlanId = "pro" | "lifetime";

interface IBillingActionResponse {
    error?: string;
    url?: string;
}

async function fetchBillingUrl(
    input: RequestInfo | URL,
    init?: RequestInit,
): Promise<string> {
    const response = await fetch(input, init);
    const payload = (await response.json()) as IBillingActionResponse;

    if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Billing action failed.");
    }

    return payload.url;
}

export async function redirectToCheckout(plan: TBillingClientPlanId) {
    const url = await fetchBillingUrl("/api/stripe/checkout", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
    });

    window.location.href = url;
}

export async function redirectToBillingPortal() {
    const url = await fetchBillingUrl("/api/stripe/portal", {
        method: "POST",
    });

    window.location.href = url;
}
