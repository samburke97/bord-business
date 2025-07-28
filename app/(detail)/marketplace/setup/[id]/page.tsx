import LocationDetailPage from "@/components/locations/details/LocationDetailPage";

export default async function LocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  return <LocationDetailPage params={{ id }} />;
}
