"use client";

import { Card, CardBody } from "@heroui/react";

const features = [
  {
    icon: "📊",
    title: "Visual Progress Tracking",
    description:
      "See your habits come to life with beautiful GitHub-style heatmaps and progress charts.",
  },
  {
    icon: "🔥",
    title: "Streak Tracking",
    description:
      "Build momentum with streak counters that motivate you to maintain consistency every day.",
  },
  {
    icon: "📅",
    title: "Flexible Scheduling",
    description:
      "Set daily, weekly, or custom schedules that fit your unique lifestyle and goals.",
  },
  {
    icon: "📈",
    title: "Smart Analytics",
    description:
      "Gain insights into your habits with completion rates, longest streaks, and trend analysis.",
  },
  {
    icon: "🎨",
    title: "Customizable Habits",
    description:
      "Personalize each habit with colors, descriptions, and notes to make them truly yours.",
  },
  {
    icon: "🔒",
    title: "Secure & Private",
    description:
      "Your data is encrypted and secure. We respect your privacy and never share your information.",
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
            Powerful features designed to help you stay consistent and achieve
            your goals.
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
                <p className="text-foreground-600">{feature.description}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
