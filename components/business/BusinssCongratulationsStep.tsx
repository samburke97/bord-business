// components/business/BusinessCongratulationsStep.tsx
"use client";

import TitleDescription from "@/components/ui/TitleDescription";
import Button from "@/components/ui/Button";
import styles from "./BusinessCongratulationsStep.module.css";

interface BusinessCongratulationsStepProps {
  businessName: string;
  onContinue: () => void;
}

export default function BusinessCongratulationsStep({
  businessName,
  onContinue,
}: BusinessCongratulationsStepProps) {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <div className={styles.checkIcon}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            className={styles.checkSvg}
          >
            <circle
              cx="32"
              cy="32"
              r="30"
              stroke="#59d472"
              strokeWidth="4"
              fill="none"
            />
            <path
              d="M20 32l8 8 16-16"
              stroke="#59d472"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>

        <TitleDescription
          title="Congratulations"
          description="You have successfully completed your business account onboarding, it's game time."
        />

        <div className={styles.buttonContainer}>
          <Button variant="primary-green" onClick={onContinue} fullWidth>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
