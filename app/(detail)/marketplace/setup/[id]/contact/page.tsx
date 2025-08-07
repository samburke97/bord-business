"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import CountryCodeSelect from "@/components/ui/CountryCodeSelect";
import TextInput from "@/components/ui/TextInput";
import Toast from "@/components/ui/Toast";
import styles from "./page.module.css";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface ContactFormData {
  phone: string;
  countryCode: string;
  email: string;
  website: string;
  socials: {
    platform: string;
    url: string;
  }[];
}

interface FormErrors {
  phone?: string;
  email?: string;
  website?: string;
  socials?: string[];
}

interface ContactEditPageProps {
  centerId?: string;
  formData?: any; // TODO: Define proper contact form data type
  onContinue?: (data: any) => void;
  // Legacy props for standalone edit mode
  params?: Promise<{ id: string }>;
}

export default function ContactEditPage({
  centerId,
  formData: initialFormData,
  onContinue,
  params,
}: ContactEditPageProps) {
  // Determine if we're in setup mode (parent manages data) or standalone edit mode
  const isSetupMode = !!centerId && !!onContinue;

  // For standalone mode, we need to get ID from params
  const [standaloneId, setStandaloneId] = useState<string | null>(null);
  const id = isSetupMode ? centerId : standaloneId;

  const router = useRouter();

  // Initialize standalone mode ID
  useEffect(() => {
    if (!isSetupMode && params) {
      const getId = async () => {
        const resolvedParams = await params;
        setStandaloneId(resolvedParams.id);
      };
      getId();
    }
  }, [params, isSetupMode]);

  const [isLoading, setIsLoading] = useState(!isSetupMode);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

  const [formData, setFormData] = useState<ContactFormData>({
    phone: "",
    countryCode: "+44", // Default to UK
    email: "",
    website: "",
    socials: [
      { platform: "Facebook", url: "" },
      { platform: "Instagram", url: "" },
      { platform: "TikTok", url: "" },
      { platform: "Youtube", url: "" },
      { platform: "X (Twitter)", url: "" },
    ],
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // NEW: Add validation function
  const validateContactForm = (): boolean => {
    return !!(formData.website && formData.website.trim());
  };

  // Fetch existing data in setup mode to prefill form
  useEffect(() => {
    const fetchExistingData = async () => {
      if (!id || !isSetupMode) return;

      try {
        setIsLoadingData(true);
        const response = await fetch(`/api/marketplace/${id}`);

        if (response.ok) {
          const data = await response.json();

          // Parse phone number
          if (data.phone) {
            const cleanedPhone = data.phone.trim().replace(/\s+/g, " ");

            const duplicatedCodeMatch = cleanedPhone.match(
              /^\+(\d+)\s+\+?(\d+)\s+(.*)$/
            );
            if (
              duplicatedCodeMatch &&
              duplicatedCodeMatch[1] === duplicatedCodeMatch[2]
            ) {
              setFormData((prev) => ({
                ...prev,
                countryCode: `+${duplicatedCodeMatch[1]}`,
                phone: duplicatedCodeMatch[3],
              }));
            } else {
              const phoneMatch = cleanedPhone.match(/^\+(\d+)\s*(.*)$/);
              if (phoneMatch) {
                setFormData((prev) => ({
                  ...prev,
                  countryCode: `+${phoneMatch[1]}`,
                  phone: phoneMatch[2],
                }));
              } else {
                setFormData((prev) => ({
                  ...prev,
                  phone: cleanedPhone,
                }));
              }
            }
          }

          if (data.email) {
            setFormData((prev) => ({
              ...prev,
              email: data.email,
            }));
          }

          if (data.links && data.links.length > 0) {
            const websiteLink = data.links.find(
              (link: any) =>
                link.type?.toLowerCase() === "website" || !link.type
            );

            if (websiteLink && websiteLink.url) {
              setFormData((prev) => ({
                ...prev,
                website: websiteLink.url,
              }));
            }
          }

          if (data.socials && data.socials.length > 0) {
            const updatedSocials = [...formData.socials];

            data.socials.forEach((social: any) => {
              const platformIndex = updatedSocials.findIndex(
                (s) =>
                  s.platform.toLowerCase() === social.platform?.toLowerCase()
              );

              if (platformIndex !== -1 && social.url) {
                updatedSocials[platformIndex].url = social.url;
              }
            });

            setFormData((prev) => ({
              ...prev,
              socials: updatedSocials,
            }));
          }
        }
      } catch (error) {
        // Continue with empty form on error
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchExistingData();
  }, [id, isSetupMode]);

  // Fetch existing contact data for standalone mode
  useEffect(() => {
    const fetchContactData = async () => {
      if (!id || isSetupMode) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/marketplace/${id}`);

        if (!response.ok) {
          throw new Error("Failed to fetch location data");
        }

        const data = await response.json();

        // Previous phone number parsing logic remains the same
        if (data.phone) {
          const cleanedPhone = data.phone.trim().replace(/\s+/g, " ");

          const duplicatedCodeMatch = cleanedPhone.match(
            /^\+(\d+)\s+\+?(\d+)\s+(.*)$/
          );
          if (
            duplicatedCodeMatch &&
            duplicatedCodeMatch[1] === duplicatedCodeMatch[2]
          ) {
            setFormData((prev) => ({
              ...prev,
              countryCode: `+${duplicatedCodeMatch[1]}`,
              phone: duplicatedCodeMatch[3],
            }));
          } else {
            const phoneMatch = cleanedPhone.match(/^\+(\d+)\s*(.*)$/);
            if (phoneMatch) {
              setFormData((prev) => ({
                ...prev,
                countryCode: `+${phoneMatch[1]}`,
                phone: phoneMatch[2],
              }));
            } else {
              setFormData((prev) => ({
                ...prev,
                phone: cleanedPhone,
              }));
            }
          }
        }

        if (data.email) {
          setFormData((prev) => ({
            ...prev,
            email: data.email,
          }));
        }

        if (data.links && data.links.length > 0) {
          const websiteLink = data.links.find(
            (link: any) => link.type?.toLowerCase() === "website" || !link.type
          );

          if (websiteLink && websiteLink.url) {
            setFormData((prev) => ({
              ...prev,
              website: websiteLink.url,
            }));
          }
        }

        if (data.socials && data.socials.length > 0) {
          const updatedSocials = [...formData.socials];

          data.socials.forEach((social: any) => {
            const platformIndex = updatedSocials.findIndex(
              (s) => s.platform.toLowerCase() === social.platform?.toLowerCase()
            );

            if (platformIndex !== -1 && social.url) {
              updatedSocials[platformIndex].url = social.url;
            }
          });

          setFormData((prev) => ({
            ...prev,
            socials: updatedSocials,
          }));
        }
      } catch (error) {
        console.error("Error fetching contact data:", error);
        setToast({
          visible: true,
          message: "Failed to load contact information",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (id && !isSetupMode) {
      fetchContactData();
    }
  }, [id, isSetupMode]);

  // UPDATED: Handle continue for setup mode with validation
  const handleContinue = () => {
    if (isSetupMode && onContinue) {
      if (!validateContactForm()) {
        setToast({
          visible: true,
          message: "Website URL is required to complete your profile",
          type: "error",
        });
        return;
      }
      onContinue({ contact: formData });
    }
  };

  // UPDATED: Expose handleContinue to window for header button with validation
  useEffect(() => {
    if (isSetupMode) {
      // @ts-ignore
      window.marketplaceSetup = window.marketplaceSetup || {};
      // @ts-ignore
      window.marketplaceSetup.handleStepContinue = () => {
        if (!validateContactForm()) {
          setToast({
            visible: true,
            message: "Website URL is required to complete your profile",
            type: "error",
          });
          return;
        }
        handleContinue();
      };

      return () => {
        // @ts-ignore
        if (window.marketplaceSetup) {
          delete window.marketplaceSetup.handleStepContinue;
        }
      };
    }
  }, [formData, isSetupMode]);

  const handleCountryCodeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      countryCode: value,
    }));
  };

  const validatePhoneNumber = (input: string): string => {
    return input.replace(/^\+\d+\s*/, "");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Reset form submitted and errors when user starts editing
    setFormSubmitted(false);
    setFormErrors({});

    if (name === "phone") {
      const cleanedPhoneNumber = validatePhoneNumber(value);
      setFormData((prev) => ({
        ...prev,
        phone: cleanedPhoneNumber,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSocialChange = (index: number, value: string) => {
    // Reset form submitted and errors when user starts editing
    setFormSubmitted(false);
    setFormErrors({});

    const updatedSocials = [...formData.socials];
    updatedSocials[index].url = value;

    setFormData((prev) => ({
      ...prev,
      socials: updatedSocials,
    }));
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Validate email if provided
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Invalid email address";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleClose = () => {
    if (!isSetupMode) {
      router.push("/marketplace");
    }
  };

  const handleSubmit = async () => {
    if (!id || isSaving || isSetupMode) return;

    setFormSubmitted(true);

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      // Format the phone number with country code
      let formattedPhone = null;
      if (formData.phone.trim()) {
        const cleanedPhoneNumber = formData.phone.trim().replace(/\s+/g, " ");

        if (cleanedPhoneNumber.startsWith("+")) {
          formattedPhone = cleanedPhoneNumber;
        } else {
          formattedPhone = `${formData.countryCode} ${cleanedPhoneNumber}`;
        }
      }

      // Prepare the payload
      const payload = {
        phone: formattedPhone,
        email: formData.email || null,
        website: formData.website || null,
        socials: formData.socials
          .filter((social) => social.url?.trim())
          .map((social) => ({
            platform: social.platform,
            url: social.url.trim(),
          })),
      };

      // Send the update
      const response = await fetch(`/api/marketplace/${id}/contact`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to update contact information");
      }

      setToast({
        visible: true,
        message: "Contact information updated successfully",
        type: "success",
      });

      // Navigate back to the location detail page after a short delay
      setTimeout(() => {
        router.push("/marketplace");
      }, 1500);
    } catch (error) {
      setToast({
        visible: true,
        message: "Failed to save contact information",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Close the toast
  const closeToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  // Don't render until we have an ID
  if (!id) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching existing data in setup mode
  if (isSetupMode && isLoadingData) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <p>Loading existing data...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {/* Only show ActionHeader in standalone edit mode */}
      {!isSetupMode && (
        <ActionHeader
          primaryAction={handleSubmit}
          secondaryAction={handleClose}
          primaryLabel="Save"
          secondaryLabel="Close"
          variant="edit"
        />
      )}

      <div className={styles.container}>
        <TitleDescription
          title="Contact & Socials"
          description="Please add all your businesses facilities and what sports you cater for."
        />
        <div className={styles.content}>
          {/* Mobile Phone Input */}
          <div className={styles.formGroup}>
            <label>Mobile</label>
            <div className={styles.phoneInputGroup}>
              <CountryCodeSelect
                value={formData.countryCode}
                onChange={handleCountryCodeChange}
              />
              <TextInput
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter number without country code"
                error={formSubmitted ? formErrors.phone : null}
              />
            </div>
            <div className={styles.helperText}>
              Please enter only the number without the country code
            </div>
          </div>

          {/* Business Email Input */}
          <TextInput
            id="email"
            name="email"
            label="Business Email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your business email address"
            error={formSubmitted ? formErrors.email : null}
          />

          {/* Website Input - REQUIRED */}
          <TextInput
            id="website"
            name="website"
            label="Website*"
            value={formData.website}
            onChange={handleInputChange}
            placeholder="https://your-website.com"
            required
            error={
              !formData.website.trim() ? "Website URL is required" : undefined
            }
          />

          {/* Social Media Inputs */}
          <div className={styles.formGroup}>
            <label>Socials</label>
            {formData.socials.map((social, index) => (
              <div key={social.platform} className={styles.socialInputGroup}>
                <div className={styles.socialPlatform}>{social.platform}</div>
                <TextInput
                  id={`social-${social.platform}`}
                  value={social.url}
                  onChange={(e) => handleSocialChange(index, e.target.value)}
                  placeholder={`${social.platform} link`}
                  error={
                    formSubmitted && formErrors.socials
                      ? formErrors.socials[index]
                      : null
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {toast.visible && (
          <div className={styles.toastContainer}>
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={closeToast}
            />
          </div>
        )}
      </div>
    </>
  );
}
