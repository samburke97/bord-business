// components/auth/Congratulations.tsx
"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import styles from "./Congratulations.module.css";

interface CongratulationsProps {
  onContinue: () => void;
  onRemindLater: () => void;
}

export default function Congratulations({
  onContinue,
  onRemindLater,
}: CongratulationsProps) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          <div className={styles.checkIcon}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M16 24l6 6 12-12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
        </div>

        <div className={styles.textContent}>
          <h1 className={styles.title}>Congratulations</h1>
          <p className={styles.description}>
            Let's Complete your player account setup or you can come back to it
            later.
          </p>
        </div>

        <div className={styles.buttonContainer}>
          <Button variant="primary-green" onClick={onContinue} fullWidth>
            Continue
          </Button>

          <Button variant="secondary" onClick={onRemindLater} fullWidth>
            Remind me Later
          </Button>
        </div>
      </div>
    </div>
  );
}
