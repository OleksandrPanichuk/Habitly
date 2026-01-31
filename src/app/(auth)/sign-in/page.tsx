"use client";

import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
  Input,
} from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

const signInSchema = z.object({
  email: z.email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

type TSignInFormValues = z.infer<typeof signInSchema>;

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TSignInFormValues>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: TSignInFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        setError(result.error.message || "Failed to sign in");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
        <h2 className="text-2xl font-bold">Welcome back</h2>
        <p className="text-small text-default-500">
          Sign in to your account to continue
        </p>
      </CardHeader>
      <Divider />
      <CardBody className="px-6 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {resetSuccess && (
            <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 text-success-700 dark:text-success-400 px-4 py-3 rounded-lg text-sm">
              <p className="font-semibold">Password reset successful!</p>
              <p className="text-sm mt-1">
                You can now sign in with your new password.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-600 dark:text-danger-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Input
            {...register("email")}
            type="email"
            label="Email"
            placeholder="Enter your email"
            variant="bordered"
            isInvalid={!!errors.email}
            errorMessage={errors.email?.message}
            autoComplete="email"
          />

          <Input
            {...register("password")}
            type="password"
            label="Password"
            placeholder="Enter your password"
            variant="bordered"
            isInvalid={!!errors.password}
            errorMessage={errors.password?.message}
            autoComplete="current-password"
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            color="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full font-semibold"
          >
            Sign In
          </Button>
        </form>
      </CardBody>
      <Divider />
      <CardFooter className="px-6 py-4 justify-center">
        <p className="text-small text-default-500">
          Don't have an account?{" "}
          <Link
            href="/sign-up"
            className="text-primary hover:underline font-semibold"
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full">
          <CardBody className="px-6 py-8">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          </CardBody>
        </Card>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
