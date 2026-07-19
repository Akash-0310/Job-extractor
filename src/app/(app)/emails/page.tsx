'use client';

import { RecipientsView } from '@/components/recipients/RecipientsView';

export default function EmailsPage() {
  return (
    <RecipientsView
      title="Email List"
      subtitle="Every unique HR/company recipient, deduplicated. Click a row for full details and send history."
    />
  );
}
