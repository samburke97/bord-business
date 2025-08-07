// types/components.d.ts

// Fix BusinessCongratulationsStep
export interface BusinessCongratulationsStepProps {
  businessName: string;
  onContinue: () => void;
}

// Fix ActionHeader
export interface ActionHeaderProps {
  onSave?: () => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

// Fix TitleDescription
export interface TitleDescriptionProps {
  title: string;
  count?: number;
}

// Fix LocationDetailsHeader
export interface LocationDetailsHeaderProps {
  steps: string[];
  currentStep: number;
  onBack: () => void;
  onContinue: () => void;
  onClose: () => void;
  className?: string;
}

// Fix SearchDropDown
export interface SearchDropDownProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Fix TextInput
export interface TextInputProps {
  id?: string; // Make optional or auto-generate
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  maxLength?: number;
  key?: number;
}

// Journey State
export interface UserJourneyState {
  onboardingData?: any;
  [key: string]: any;
}

// Journey Update Response
export interface JourneyUpdateResponse {
  success: boolean;
  message?: string;
  performance: {
    databaseTime: number;
    sessionTime: number;
    totalTime: number;
  };
}
