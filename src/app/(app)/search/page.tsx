'use client';

import { RecipientsView } from '@/components/recipients/RecipientsView';

export default function SearchPage() {
  return (
    <RecipientsView
      title="Search"
      subtitle="Search across recipients by company, email, domain, subject, template, and date."
    />
  );
}
