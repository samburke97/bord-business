// app/page.tsx - OPTIMIZED
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserJourneyService } from "@/lib/services/UserJourneyService";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
    return;
  }

  try {
    // ✅ OPTIMIZED: Get journey from session cache (no DB hit!)
    const journeyState = UserJourneyService.getJourneyFromSession(session);

    if (!journeyState) {
      // Fallback: refresh session and try again
      redirect("/api/auth/session?refresh=true");
      return;
    }

    // Determine next route (pure function - instant)
    const nextRoute = UserJourneyService.determineNextRoute(journeyState);

    redirect(nextRoute);
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("User journey error:", error);
    redirect("/login");
  }
}
