import { ReactNode } from "react";
import AuthLayout from "@/components/layouts/AuthLayout";
import RecaptchaProvider from "@/components/providers/RecaptchaProvider";

export default function AuthLayoutWrapper({
  children,
}: {
  children: ReactNode;
}) {
  return <RecaptchaProvider>{children}</RecaptchaProvider>;
}
