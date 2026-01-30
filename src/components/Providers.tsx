"use client";

import { HeroUIProvider } from "@heroui/react";
import type { PropsWithChildren } from "react";
import { TRPCReactProvider } from "@/trpc/client";

export const Providers = ({ children }: PropsWithChildren) => {
  return (
    <TRPCReactProvider>
      <HeroUIProvider>{children}</HeroUIProvider>;
    </TRPCReactProvider>
  );
};
