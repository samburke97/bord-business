"use client";

import ContactEditPage from "../../setup/[id]/contact/page";

interface ContactPageProps {
  params: Promise<{ id: string }>;
}

export default function ContactPage({ params }: ContactPageProps) {
  return <ContactEditPage params={params} />;
}
