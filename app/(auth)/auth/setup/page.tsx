"use client";

import { Suspense } from "react";
import AuthFlowManager from "@/components/auth/AuthFlowManager";

function AuthSetupContent() {
  return <AuthFlowManager />;
}

export default function AuthSetup() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            backgroundColor: "#f9fafb",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid #e5e7eb",
                borderTop: "4px solid #10b981",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <div style={{ textAlign: "center" }}>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#1f2937",
                  margin: "0 0 8px 0",
                }}
              >
                Loading...
              </h2>
              <p
                style={{
                  color: "#6b7280",
                  margin: 0,
                  fontSize: "14px",
                }}
              >
                Setting up your account
              </p>
            </div>
          </div>
        </div>
      }
    >
      <AuthSetupContent />
    </Suspense>
  );
}
