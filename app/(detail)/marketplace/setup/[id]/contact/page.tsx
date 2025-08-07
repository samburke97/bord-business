"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

// FIXED: Only accept params as required by Next.js pages
interface ContactEditPageProps {
  params: Promise<{ id: string }>;
}

export default function ContactEditPage({ params }: ContactEditPageProps) {
  const router = useRouter();

  // Get the ID from params
  const [id, setId] = useState<string | null>(null);

  // Initialize ID from params
  useEffect(() => {
    const getId = async () => {
      const resolvedParams = await params;
      setId(resolvedParams.id);
    };
    getId();
  }, [params]);

  const [isLoading, setIsLoading] = useState(true);
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

  // Fetch existing data when ID is available
  useEffect(() => {
    const fetchExistingData = async () => {
      if (!id) return;

      try {
        setIsLoading(true);

        const response = await fetch(`/api/marketplace/${id}/contact`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();

          setFormData({
            phone: data.phone || "",
            countryCode: data.countryCode || "+44",
            email: data.email || "",
            website: data.website || "",
            socials: data.socials || [
              { platform: "Facebook", url: "" },
              { platform: "Instagram", url: "" },
              { platform: "TikTok", url: "" },
              { platform: "Youtube", url: "" },
              { platform: "X (Twitter)", url: "" },
            ],
          });
        }
      } catch (error) {
        console.error("Error fetching contact data:", error);
        // Continue with empty form on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingData();
  }, [id]);

  // Validation function
  const validateContactForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    // Email validation
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = "Please enter a valid email address";
        isValid = false;
      }
    }

    // Phone validation
    if (formData.phone) {
      const phoneRegex = /^[\d\s\-\(\)\+]+$/;
      if (!phoneRegex.test(formData.phone)) {
        errors.phone = "Please enter a valid phone number";
        isValid = false;
      }
    }

    // Website validation
    if (formData.website) {
      try {
        const url = formData.website.startsWith("http")
          ? formData.website
          : `https://${formData.website}`;
        new URL(url);
      } catch {
        errors.website = "Please enter a valid website URL";
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  // Save function for standalone edit mode
  const handleSave = async () => {
    if (!id || isSaving) return;

    if (!validateContactForm()) {
      setFormSubmitted(true);
      return;
    }

    try {
      setIsSaving(true);

      // Format phone number
      let formattedPhone = null;
      if (formData.phone && formData.phone.trim()) {
        const cleanedPhoneNumber = formData.phone.trim();
        formattedPhone = cleanedPhoneNumber.startsWith("+")
          ? cleanedPhoneNumber
          : `${formData.countryCode} ${cleanedPhoneNumber}`;
      }

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

      const response = await fetch(`/api/marketplace/${id}/contact`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to save contact information");
      }

      setToast({
        visible: true,
        message: "Contact information saved successfully!",
        type: "success",
      });

      // Redirect after delay
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

  // Form handlers
  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSocialChange = (index: number, url: string) => {
    const newSocials = [...formData.socials];
    newSocials[index] = { ...newSocials[index], url };
    setFormData((prev) => ({ ...prev, socials: newSocials }));
  };

  // Show loading while ID or data is loading
  if (!id || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <LoadingSpinner />
          <p>Loading contact information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ActionHeader
        primaryAction={handleSave}
        secondaryAction={() => router.push("/marketplace")}
        isProcessing={isSaving}
      />

      <div className={styles.formContainer}>
        <TitleDescription
          title="Contact & Links"
          description="Add your contact information and social media links so customers can reach you."
        />

        {/* Phone Section */}
        <div className={styles.section}>
          <label className={styles.label}>Phone Number</label>
          <div className={styles.phoneContainer}>
            <CountryCodeSelect
              value={formData.countryCode}
              onChange={(code) => handleInputChange("countryCode", code)}
            />
            <TextInput
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="Enter phone number"
              error={formSubmitted ? formErrors.phone : undefined}
            />
          </div>
        </div>

        {/* Email Section */}
        <div className={styles.section}>
          <label className={styles.label}>Email Address</label>
          <TextInput
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            placeholder="Enter email address"
            type="email"
            error={formSubmitted ? formErrors.email : undefined}
          />
        </div>

        {/* Website Section */}
        <div className={styles.section}>
          <label className={styles.label}>Website</label>
          <TextInput
            value={formData.website}
            onChange={(e) => handleInputChange("website", e.target.value)}
            placeholder="Enter website URL"
            error={formSubmitted ? formErrors.website : undefined}
          />
        </div>

        {/* Social Media Section */}
        <div className={styles.section}>
          <label className={styles.label}>Social Media</label>
          <div className={styles.socialsContainer}>
            {formData.socials.map((social, index) => (
              <div key={social.platform} className={styles.socialItem}>
                <span className={styles.socialPlatform}>{social.platform}</span>
                <TextInput
                  value={social.url}
                  onChange={(e) => handleSocialChange(index, e.target.value)}
                  placeholder={`Enter ${social.platform} URL`}
                  error={
                    formSubmitted ? formErrors.socials?.[index] : undefined
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      )}
    </div>
  );
}
