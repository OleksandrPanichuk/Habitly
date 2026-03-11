import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getAppUrl, getStripe } from "@/lib/stripe";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const [user] = await db
            .select({
                stripeCustomerId: users.stripeCustomerId,
                subscriptionTier: users.subscriptionTier,
            })
            .from(users)
            .where(eq(users.id, session.user.id))
            .limit(1);

        if (!user?.stripeCustomerId) {
            return NextResponse.json(
                { error: "No billing profile found for this account." },
                { status: 404 },
            );
        }

        if (user.subscriptionTier !== "pro") {
            return NextResponse.json(
                {
                    error: "Billing management is only available for active Pro subscriptions.",
                },
                { status: 400 },
            );
        }

        const portalSession = await getStripe().billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${getAppUrl()}/settings`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error) {
        console.error("Stripe portal error", error);

        return NextResponse.json(
            { error: "Unable to open billing settings right now." },
            { status: 500 },
        );
    }
}
