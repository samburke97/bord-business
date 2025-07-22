// components/providers/AuthProvider.tsx - Combined with reCAPTCHA
"use client";

import { SessionProvider } from "next-auth/react";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { ReactNode } from "react";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  return (
    <SessionProvider>
      {recaptchaKey ? (
        <GoogleReCaptchaProvider
          reCaptchaKey={recaptchaKey}
          scriptProps={{
            async: false,
            defer: false,
            appendTo: "head",
            nonce: undefined,
          }}
        >
          {children}
        </GoogleReCaptchaProvider>
      ) : (
        <>
          {process.env.NODE_ENV === "development"}
          {children}
        </>
      )}
    </SessionProvider>
  );
}
