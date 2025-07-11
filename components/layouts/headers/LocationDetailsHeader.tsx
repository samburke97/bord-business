// components/layouts/headers/LocationDetailsHeader.tsx - FIXED CLOSE BUTTON LOGIC
"use client";

import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import ProgressBar from "@/components/ui/ProgressBar";
import styles from "./LocationDetailsHeader.module.css";

interface LocationDetailsHeaderProps {
  currentStep: number;
  steps: string[];
  onBack: () => void;
  onContinue: () => void;
  onClose?: () => void;
  disableContinue?: boolean;
  className?: string;
  mode?: "create" | "edit";
}

const LocationDetailsHeader: React.FC<LocationDetailsHeaderProps> = ({
  currentStep,
  steps,
  onBack,
  onContinue,
  onClose,
  disableContinue = false,
  className = "",
  mode = "create",
}) => {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const getButtonText = () => {
    if (isLastStep) {
      return mode === "create" ? "Create" : "Update";
    }
    return "Continue";
  };

  return (
    <header className={`${styles.header} ${className}`}>
      <div className={styles.headerContent}>
        <div className={styles.progressContainer}>
          <ProgressBar steps={steps} currentStep={currentStep} />
        </div>

        <div className={styles.navigationRow}>
          <div className={styles.leftButtonContainer}>
            {isFirstStep && onClose ? (
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
            ) : !isFirstStep ? (
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
            ) : null}
          </div>

          <div className={styles.continueButtonContainer}>
            <Button
              onClick={onContinue}
              disabled={disableContinue}
              className={styles.continueButton}
            >
              {getButtonText()}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default LocationDetailsHeader;
