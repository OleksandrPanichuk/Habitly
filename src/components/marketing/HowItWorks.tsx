"use client";

import { Card, CardBody } from "@heroui/react";

const steps = [
  {
    number: "01",
    title: "Create Your Habits",
    description:
      "Start by adding the habits you want to build. Set custom names, descriptions, and colors to organize them.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    number: "02",
    title: "Check In Daily",
    description:
      "Mark your habits as complete each day with a simple click. Add notes to track your thoughts and progress.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    number: "03",
    title: "Build Streaks",
    description:
      "Watch your streaks grow as you maintain consistency. Stay motivated by seeing your progress visualized.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    number: "04",
    title: "Analyze & Improve",
    description:
      "Review your analytics, identify patterns, and adjust your approach to achieve even better results.",
    gradient: "from-green-500 to-emerald-500",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-content1"
    >
      <div className="container mx-auto max-w-6xl">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold">
            Simple Yet{" "}
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              Powerful
            </span>
          </h2>
          <p className="text-lg text-foreground-600 max-w-2xl mx-auto">
            Building habits doesn't have to be complicated. Follow these four
            simple steps to transform your life.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {steps.map((step) => (
            <Card
              key={step.number}
              className="bg-background border border-divider hover:border-primary/50 transition-all duration-300"
            >
              <CardBody className="p-8 space-y-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`text-6xl font-bold bg-linear-to-r ${step.gradient} bg-clip-text text-transparent`}
                  >
                    {step.number}
                  </div>
                  <div className="flex-1 space-y-2 pt-2">
                    <h3 className="text-2xl font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-foreground-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
