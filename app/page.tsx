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

  // CRITICAL FIX: Never redirect to dashboard from here
  // Always send authenticated users to /auth/setup which will handle the proper routing
  console.log(
    "🏠 Home page: Authenticated user, sending to setup for verification"
  );
  redirect("/auth/setup");
}
