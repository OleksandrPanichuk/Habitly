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

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.resetPassword({
        newPassword: data.password,
        token,
      });

      if (result.error) {
        setError(result.error.message || "Failed to reset password");
        return;
      }

      // Redirect to sign in page with success message
      router.push("/sign-in?reset=success");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full">
        <CardBody className="px-6 py-8">
          <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-600 dark:text-danger-400 px-4 py-4 rounded-lg text-center">
            <p className="font-semibold mb-1">Invalid Reset Link</p>
            <p className="text-sm">
              This password reset link is invalid or has expired. Please request
              a new one.
            </p>
          </div>
        </CardBody>
        <Divider />
        <CardFooter className="px-6 py-4 justify-center">
          <Link
            href="/forgot-password"
            className="text-primary hover:underline font-semibold"
          >
            Request new reset link
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
        <h2 className="text-2xl font-bold">Set new password</h2>
        <p className="text-small text-default-500">
          Enter your new password below
        </p>
      </CardHeader>
      <Divider />
      <CardBody className="px-6 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && (
            <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-600 dark:text-danger-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Input
            {...register("password")}
            type="password"
            label="New Password"
            placeholder="Enter new password"
            variant="bordered"
            isInvalid={!!errors.password}
            errorMessage={errors.password?.message}
            autoComplete="new-password"
          />

          <Input
            {...register("confirmPassword")}
            type="password"
            label="Confirm Password"
            placeholder="Confirm new password"
            variant="bordered"
            isInvalid={!!errors.confirmPassword}
            errorMessage={errors.confirmPassword?.message}
            autoComplete="new-password"
          />

          <Button
            type="submit"
            color="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full font-semibold mt-2"
          >
            Reset Password
          </Button>
        </form>
      </CardBody>
      <Divider />
      <CardFooter className="px-6 py-4 justify-center">
        <p className="text-small text-default-500">
          Remember your password?{" "}
          <Link
            href="/sign-in"
            className="text-primary hover:underline font-semibold"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordForm />
    </Suspense>
  );
}
