"use client";

import { Card, CardBody } from "@heroui/react";

const features = [
    {
        icon: "🧭",
        title: "Guided Daily Check-ins",
        description:
            "Start with onboarding, a clean day-one dashboard, and recovery prompts that keep the habit loop obvious.",
    },
    {
        icon: "🔥",
        title: "Streaks With Recovery",
        description:
            "See momentum clearly, but also get nudged back into the system when yesterday slipped.",
    },
    {
        icon: "🎯",
        title: "Goal-Based Habits",
        description:
            "Track simple check-offs, count-based goals, or duration targets without leaving the same flow.",
    },
    {
        icon: "📈",
        title: "Actionable Analytics",
        description:
            "Spot weak weekdays, strongest categories, and habits that are starting to decay before they fully break.",
    },
    {
        icon: "📬",
        title: "Premium Email Reminders",
        description:
            "Turn on one daily reminder window and only include the habits that actually need a prompt.",
    },
    {
        icon: "📝",
        title: "Reflection Built In",
        description:
            "Capture short notes after completions so your weekly review has real context instead of guesswork.",
    },
];

export function Features() {
    return (
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="container mx-auto max-w-6xl">
                {/* Section header */}
                <div className="text-center space-y-4 mb-16">
                    <h2 className="text-4xl sm:text-5xl font-bold">
                        Everything You Need to{" "}
                        <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Build Better Habits
                        </span>
                    </h2>
                    <p className="text-lg text-foreground-600 max-w-2xl mx-auto">
                        Powerful features designed to help you stay consistent
                        and achieve your goals.
                    </p>
                </div>

                {/* Features grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature) => (
                        <Card
                            key={feature.title}
                            className="bg-content1 border border-divider hover:border-primary/50 transition-all duration-300 hover:scale-105"
                        >
                            <CardBody className="p-6 space-y-3">
                                <div className="text-4xl">{feature.icon}</div>
                                <h3 className="text-xl font-semibold text-foreground">
                                    {feature.title}
                                </h3>
                                <p className="text-foreground-600">
                                    {feature.description}
                                </p>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
