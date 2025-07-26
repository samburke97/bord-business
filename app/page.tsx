// app/page.tsx - Enterprise User Journey Routing
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
    // Get comprehensive user journey state
    const journeyState = await UserJourneyService.getUserJourneyState(
      session.user.id
    );

    // Determine next route based on enterprise logic
    const nextRoute = UserJourneyService.determineNextRoute(journeyState);

    // Debug logging in development
    if (process.env.NODE_ENV === "development") {
      console.log("🚀 Enterprise Journey Routing:", {
        userId: session.user.id,
        authMethod: journeyState.authMethod,
        currentStep: journeyState.currentStep,
        hasViewedSuccess: journeyState.hasViewedSuccess,
        intention: journeyState.intention,
        nextRoute,
      });
    }

    redirect(nextRoute);
  } catch (error) {
    console.error("User journey error:", error);
    // Fallback to login on error
    redirect("/login");
  }
}
