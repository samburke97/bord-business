// app/page.tsx - Updated home page routing
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  console.log("🏠 Home page: Session check:", { hasSession: !!session });

  if (!session) {
    console.log("🏠 Home page: No session, redirecting to login");
    redirect("/login");
    return;
  }

  // CRITICAL FIX: Check if user came from OAuth by checking their accounts
  // If they have OAuth accounts and no email credentials, send to OAuth setup
  try {
    // You can check if this is an OAuth user by looking at their account type
    // For now, since all authenticated users should go through proper verification,
    // send everyone to OAuth setup which will handle routing properly
    console.log(
      "🏠 Home page: Authenticated user, sending to OAuth setup for verification"
    );
    redirect("/oauth/setup");
  } catch (error) {
    console.error(
      "🏠 Home page: Error checking user type, falling back to OAuth setup"
    );
    redirect("/oauth/setup");
  }
}
