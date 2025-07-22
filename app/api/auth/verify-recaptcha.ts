// app/api/auth/verify-recaptcha.ts - Helper function for reCAPTCHA verification
interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export async function verifyRecaptcha(token: string): Promise<{
  success: boolean;
  score?: number;
  error?: string;
}> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    return { success: false, error: "reCAPTCHA not configured" };
  }

  if (!token) {
    return { success: false, error: "reCAPTCHA token is required" };
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${secretKey}&response=${token}`,
      }
    );

    const data: RecaptchaResponse = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: "reCAPTCHA verification failed",
      };
    }

    // For reCAPTCHA v3, check the score (0.0 - 1.0)
    // Lower scores indicate bot-like behavior
    if (data.score !== undefined) {
      const threshold = 0.5; // Adjust based on your needs
      if (data.score < threshold) {
        return {
          success: false,
          score: data.score,
          error: "Suspicious activity detected",
        };
      }
    }

    return {
      success: true,
      score: data.score,
    };
  } catch (error) {
    return {
      success: false,
      error: "reCAPTCHA verification failed",
    };
  }
}
