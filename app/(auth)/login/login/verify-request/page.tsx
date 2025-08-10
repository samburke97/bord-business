// app/auth/verify-request/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import styles from "./page.module.css";

function VerifyRequestContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardContent}>
            {/* Icon */}
            <div className={styles.iconContainer}>
              <svg
                className={styles.icon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className={styles.title}>Check your email</h1>

            {/* Description */}
            <p className={styles.description}>
              {email ? (
                <>
                  We sent a sign in link to{" "}
                  <span className={styles.emailHighlight}>{email}</span>
                </>
              ) : (
                "We sent you a sign in link"
              )}
            </p>

            {/* Instructions */}
            <div className={styles.instructions}>
              <div className={styles.instructionItem}>
                <div className={styles.stepNumber}>1</div>
                <p className={styles.stepText}>
                  Click the link in the email to sign in
                </p>
              </div>
              <div className={styles.instructionItem}>
                <div className={styles.stepNumber}>2</div>
                <p className={styles.stepText}>
                  You can close this tab and return to the email
                </p>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className={styles.troubleshooting}>
              <p>Can't find the email? Check your spam folder.</p>
              <p>The link will expire in 24 hours.</p>
            </div>

            {/* Back to login link */}
            <div className={styles.backLink}>
              <a href="/login" className={styles.link}>
                ← Back to login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyRequestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyRequestContent />
    </Suspense>
  );
}
