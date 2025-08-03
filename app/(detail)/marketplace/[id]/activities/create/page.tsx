import { Metadata } from "next";
import { use } from "react";
import ActivityFormPage from "@/components/marketplace/details/ActvityFormPage";

interface CreateActivityPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata: Metadata = {
  title: "Create Activity | Bord",
};

export default function CreateActivityPage({
  params,
}: CreateActivityPageProps) {
  const resolvedParams = use(params);
  return <ActivityFormPage locationId={resolvedParams.id} />;
}
