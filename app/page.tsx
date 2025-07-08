// app/page.tsx - SIMPLIFIED TO PREVENT RACING REDIRECTS
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

  console.log(
    "🏠 Home page: User authenticated, redirecting to auth/setup to check profile"
  );
  redirect("/auth/setup");
}
