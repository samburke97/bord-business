import { Metadata } from "next";
import { use } from "react";
import ActivityFormPage from "@/components/marketplace/details/ActvityFormPage";

interface EditActivityPageProps {
  params: Promise<{
    id: string;
    activityId: string;
  }>;
}

export const metadata: Metadata = {
  title: "Edit Activity | Bord",
};

export default function EditActivityPage({ params }: EditActivityPageProps) {
  const resolvedParams = use(params);
  return (
    <ActivityFormPage
      locationId={resolvedParams.id}
      activityId={resolvedParams.activityId}
      key={resolvedParams.activityId}
    />
  );
}
