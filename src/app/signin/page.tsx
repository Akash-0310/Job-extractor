'use client';

import { Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function SignInInner() {
  const params = useSearchParams();
  const error = params.get('error');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50 p-4 dark:from-slate-950 dark:to-slate-900">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">📮</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Job Email Extractor</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Connect your Gmail to extract and manage the HR/company addresses from your sent job
            applications. Read-only — this app never sends email.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            Sign-in failed ({error}). Please try again.
          </div>
        )}

        <button
          className="btn-primary w-full py-3"
          onClick={() => signIn('google', { callbackUrl: '/' })}
        >
          <span aria-hidden>🔐</span> Continue with Google
        </button>

        <ul className="mt-6 space-y-2 text-xs text-slate-500 dark:text-slate-400">
          <li>✓ Uses official Gmail API OAuth (no app passwords)</li>
          <li>✓ Requests read-only Gmail access</li>
          <li>✓ Attachments are never downloaded or processed</li>
        </ul>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}
