// components/layouts/headers/LocationDetailsHeader.tsx - FIXED VERSION
"use client";

import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import ProgressBar from "@/components/ui/ProgressBar";
import styles from "./LocationDetailsHeader.module.css";

interface LocationDetailsHeaderProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
  onClose?: () => void;
  onBack?: () => void;
  onContinue: () => void;
  showContinue?: boolean;
  isLoading?: boolean;
}

export default function LocationDetailsHeader({
  currentStep,
  totalSteps,
  steps,
  onClose,
  onBack,
  onContinue,
  showContinue = true,
  isLoading = false,
}: LocationDetailsHeaderProps) {
  const isFirstStep = currentStep === 0;

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.progressContainer}>
          <ProgressBar steps={steps} currentStep={currentStep} />
        </div>

        <div className={styles.navigationRow}>
          <div className={styles.leftButtonContainer}>
            {isFirstStep
              ? // First step: show close button only if onClose is provided
                onClose && (
                  <IconButton
                    icon={
                      <img
                        src="/icons/utility-outline/cross.svg"
                        alt="Close"
                        width={20}
                        height={20}
                      />
                    }
                    onClick={onClose}
                    aria-label="Close"
                    variant="ghost"
                  />
                )
              : // Not first step: show back button
                onBack && (
                  <IconButton
                    icon={
                      <img
                        src="/icons/utility-outline/back.svg"
                        alt="Back"
                        width={20}
                        height={20}
                      />
                    }
                    onClick={onBack}
                    aria-label="Go back"
                    variant="ghost"
                  />
                )}
          </div>

          {showContinue && (
            <div className={styles.continueButtonContainer}>
              <Button
                onClick={onContinue}
                disabled={isLoading}
                className={styles.continueButton}
              >
                {isLoading ? "Creating..." : "Continue"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
