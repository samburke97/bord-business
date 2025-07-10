// hooks/useCSRF.ts - Client-side CSRF token handling
"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";

export function useCSRF() {
  const { data: session } = useSession();

  const csrfToken = useMemo(() => {
    // NextAuth automatically handles CSRF tokens in cookies
    // We can access it via the session or cookie
    if (typeof window !== "undefined") {
      // Extract CSRF token from NextAuth cookie
      const cookies = document.cookie.split(";");
      const csrfCookie = cookies.find((cookie) =>
        cookie.trim().startsWith("next-auth.csrf-token=")
      );

      if (csrfCookie) {
        return csrfCookie.split("=")[1];
      }
    }
    return null;
  }, [session]);

  /**
   * Enhanced fetch with automatic CSRF token inclusion
   */
  const csrfFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);

    // Add CSRF token for state-changing requests
    if (
      csrfToken &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(options.method || "GET")
    ) {
      headers.set("x-csrf-token", csrfToken);
    }

    // Ensure JSON content type for API requests
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: "include", // Include cookies
    });
  };

  return {
    csrfToken,
    csrfFetch,
  };
}

// Example usage in components:
export function useSecureFetch() {
  const { csrfFetch } = useCSRF();

  const secureFetch = async (
    url: string,
    data?: any,
    method: string = "POST"
  ) => {
    try {
      const response = await csrfFetch(url, {
        method,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Request failed");
      }

      return await response.json();
    } catch (error) {
      console.error("Secure fetch error:", error);
      throw error;
    }
  };

  return { secureFetch };
}
