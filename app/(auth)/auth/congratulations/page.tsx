"use client";

import { useRouter } from "next/navigation";
import Congratulations from "@/components/auth/Congratulations";

export default function CongratulationsPage() {
  const router = useRouter();

  const handleContinue = () => {
    router.push("/business-onboarding");
  };

  const handleRemindLater = () => {
    router.push("/dashboard");
  };

  return (
    <Congratulations
      title="Congratulations!"
      primaryButtonText="Continue to Business Setup"
      secondaryButtonText="Skip for Now"
      onContinue={handleContinue}
      onRemindLater={handleRemindLater}
    />
  );
}
