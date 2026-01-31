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
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

type TForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: TForgotPasswordFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: "/reset-password",
      });

      if (result.error) {
        setError(result.error.message || "Failed to send reset email");
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
        <h2 className="text-2xl font-bold">Reset password</h2>
        <p className="text-small text-default-500">
          Enter your email to receive a password reset link
        </p>
      </CardHeader>
      <Divider />
      <CardBody className="px-6 py-6">
        {success ? (
          <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 text-success-700 dark:text-success-400 px-4 py-4 rounded-lg">
            <p className="font-semibold mb-1">Check your email</p>
            <p className="text-sm">
              If an account exists with this email, you will receive a password
              reset link shortly. Please check your email and follow the
              instructions to reset your password.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
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

            <Button
              type="submit"
              color="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full font-semibold"
            >
              Send Reset Link
            </Button>
          </form>
        )}
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
