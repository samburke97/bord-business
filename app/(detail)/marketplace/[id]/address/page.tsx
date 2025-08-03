"use client";

import AddressEditPage from "../../setup/[id]/address/page";

interface AddressPageProps {
  params: Promise<{ id: string }>;
}

export default function AddressPage({ params }: AddressPageProps) {
  return <AddressEditPage params={params} />;
}
