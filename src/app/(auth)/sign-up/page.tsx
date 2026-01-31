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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { sendWelcomeEmail } from "@/lib/email";

const signUpSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters"),
    email: z.email("Invalid email address"),
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

type TSignUpFormValues = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TSignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: TSignUpFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (result.error) {
        setError(result.error.message || "Failed to create account");
        return;
      }

      sendWelcomeEmail(data.email, data.name).catch((err) => {
        console.error("Failed to send welcome email:", err);
      });

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
        <h2 className="text-2xl font-bold">Create an account</h2>
        <p className="text-small text-default-500">
          Start building better habits today
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
            {...register("name")}
            type="text"
            label="Name"
            placeholder="Enter your name"
            variant="bordered"
            isInvalid={!!errors.name}
            errorMessage={errors.name?.message}
            autoComplete="name"
          />

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
            placeholder="Create a password"
            variant="bordered"
            isInvalid={!!errors.password}
            errorMessage={errors.password?.message}
            autoComplete="new-password"
          />

          <Input
            {...register("confirmPassword")}
            type="password"
            label="Confirm Password"
            placeholder="Confirm your password"
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
            Create Account
          </Button>
        </form>
      </CardBody>
      <Divider />
      <CardFooter className="px-6 py-4 justify-center">
        <p className="text-small text-default-500">
          Already have an account?{" "}
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
