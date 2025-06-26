import React, { useCallback } from "react";
import Image from "next/image";
import TextInput from "@/components/ui/TextInput";
import SearchDropDown from "@/components/ui/SearchDropDown";
import IconButton from "@/components/ui/IconButton";
import styles from "./PricingComponent.module.css";

// Types
interface PricingVariant {
  id: string;
  playerType: string;
  duration: string;
  priceType: string;
  price: number;
}

interface PricingComponentProps {
  pricingVariants: PricingVariant[];
  setPricingVariants: React.Dispatch<React.SetStateAction<PricingVariant[]>>;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

const PRICE_TYPES = [
  { value: "Free", label: "Free" },
  { value: "From", label: "From" },
  { value: "Fixed", label: "Fixed" },
];

const PLAYER_TYPES = [
  { value: "Everyone", label: "Everyone" },
  { value: "Adults", label: "Adults" },
  { value: "Children", label: "Children" },
  { value: "Seniors", label: "Seniors" },
  { value: "Members", label: "Members" },
];

const DURATION_OPTIONS = [
  { value: "Not Specified", label: "Not Specified" },
  { value: "30mins", label: "30 mins" },
  { value: "1hr", label: "1 hr" },
  { value: "1hr 30mins", label: "1 hr 30 mins" },
  { value: "2hr", label: "2 hr" },
  { value: "2hr 30mins", label: "2 hr 30 mins" },
  { value: "3hr", label: "3 hr" },
];

const PricingComponent: React.FC<PricingComponentProps> = ({
  pricingVariants,
  setPricingVariants,
  errors,
  isSubmitting,
}) => {
  // Create a default pricing variant
  const createDefaultPricingVariant = useCallback((): PricingVariant => {
    return {
      id: `new-${Date.now()}`,
      playerType: "",
      duration: "",
      priceType: "",
      price: 0,
    };
  }, []);

  // Check if price type is "Free" - No change needed here
  const isPriceFree = useCallback((priceType: string): boolean => {
    return priceType === "Free";
  }, []);

  // Event handlers
  const handlePricingChange = (
    index: number,
    field: keyof PricingVariant,
    value: any
  ) => {
    setPricingVariants((variants) => {
      const updated = [...variants];
      let variant = { ...updated[index] };

      // Update the specific field
      variant = { ...variant, [field]: value };

      // --- MODIFICATION START ---
      // If the price type was just changed to 'Free', reset the price to 0
      if (field === "priceType" && value === "Free") {
        variant.price = 0;
      }
      // --- MODIFICATION END ---

      updated[index] = variant;
      return updated;
    });
  };

  const handleAddPricing = () => {
    if (pricingVariants.length >= 6) return;
    setPricingVariants([...pricingVariants, createDefaultPricingVariant()]);
  };

  const handleRemovePricing = (index: number) => {
    if (pricingVariants.length > 1) {
      setPricingVariants(pricingVariants.filter((_, i) => i !== index));
    }
  };

  return (
    <div className={styles.pricingSection}>
      <h2 className={styles.sectionTitle}>Pricing</h2>

      {pricingVariants.map((variant, index) => {
        // Determine if the current variant's price should be treated as free
        const treatAsFree = isPriceFree(variant.priceType);

        return (
          <div key={variant.id} className={styles.pricingRow}>
            <div className={styles.formFields}>
              {/* Player Type Dropdown - No changes needed */}
              <div className={styles.pricingField}>
                <SearchDropDown
                  label="Player Type"
                  value={variant.playerType}
                  onChange={(value) =>
                    handlePricingChange(index, "playerType", value)
                  }
                  options={PLAYER_TYPES}
                  error={errors[`pricing_${index}_playerType`]}
                  required
                  showClearButton={false}
                  placeholder={
                    PLAYER_TYPES.find(
                      (option) => option.value === variant.playerType
                    )?.label || "Select Player Type"
                  }
                />
              </div>

              {/* Duration Dropdown - No changes needed */}
              <div className={styles.pricingField}>
                <SearchDropDown
                  label="Duration"
                  value={variant.duration}
                  onChange={(value) =>
                    handlePricingChange(index, "duration", value)
                  }
                  options={DURATION_OPTIONS}
                  error={errors[`pricing_${index}_duration`]}
                  showClearButton={false}
                  placeholder={
                    DURATION_OPTIONS.find(
                      (option) => option.value === variant.duration
                    )?.label || "Select Duration"
                  }
                />
              </div>

              {/* Price Type Dropdown - No changes needed */}
              <div className={styles.pricingField}>
                <SearchDropDown
                  label="Price Type"
                  value={variant.priceType}
                  onChange={(value) =>
                    handlePricingChange(index, "priceType", value)
                  }
                  options={PRICE_TYPES}
                  error={errors[`pricing_${index}_priceType`]}
                  required
                  showClearButton={false}
                  placeholder={
                    PRICE_TYPES.find(
                      (option) => option.value === variant.priceType
                    )?.label || "Select Price Type"
                  }
                />
              </div>

              {/* Price Input - Modifications here */}
              <div className={styles.pricingField}>
                <TextInput
                  label="Price"
                  id={`price-${index}`}
                  value={treatAsFree ? "0.00" : variant.price.toString()}
                  onChange={(e) => {
                    // Only update state if not free
                    if (!treatAsFree) {
                      handlePricingChange(
                        index,
                        "price",
                        // Ensure it handles empty input gracefully back to 0
                        e.target.value === ""
                          ? 0
                          : parseFloat(e.target.value) || 0
                      );
                    }
                  }}
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={isSubmitting || treatAsFree}
                  prefix="$"
                  error={errors[`pricing_${index}_price`]}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Button Container - No changes needed */}
            <div className={styles.buttonContainer}>
              <IconButton
                variant="ghost"
                size="md"
                icon={
                  <Image
                    src={
                      index === 0 || pricingVariants.length === 1
                        ? "/icons/utility-outline/plus.svg"
                        : "/icons/utility-outline/minus.svg"
                    }
                    width={16}
                    height={16}
                    alt={
                      index === 0 || pricingVariants.length === 1
                        ? "Add pricing option"
                        : "Remove pricing option"
                    }
                  />
                }
                onClick={
                  index === 0 || pricingVariants.length === 1
                    ? pricingVariants.length < 6
                      ? handleAddPricing
                      : undefined // Disable add if max reached
                    : () => handleRemovePricing(index)
                }
                className={styles.actionButton}
                aria-label={
                  index === 0 || pricingVariants.length === 1
                    ? "Add pricing option"
                    : "Remove pricing option"
                }
                disabled={
                  isSubmitting ||
                  (pricingVariants.length >= 6 &&
                    (index === 0 || pricingVariants.length === 1))
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PricingComponent;
