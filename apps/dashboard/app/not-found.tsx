import Link from 'next/link';
import { ArrowLeft, Zap } from 'lucide-react';
import Header from '@/components/layout/Header';

export default function NotFound() {
  return (
    <>
      <Header title="Not Found" subtitle="This view isn't available yet" />
      <div className="flex min-h-[calc(100vh-var(--spacing-layout-header))] items-center justify-center p-4 sm:p-6">
        <div className="glow-cyan-sm w-full max-w-md rounded border border-border bg-bg-card px-8 py-10 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded border border-accent-cyan/30 bg-accent-cyan/10">
            <Zap className="h-5 w-5 text-accent-cyan" strokeWidth={2.5} />
          </div>

          <p className="font-mono text-xs tracking-widest text-accent-cyan">404</p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-text-primary">
            Coming soon
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            This page isn&apos;t built yet. Sentinel is still expanding — check back
            shortly or head back to the overview.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded border border-accent-cyan/30 bg-accent-cyan/10 px-4 py-2 text-xs font-medium text-accent-cyan transition-colors hover:border-accent-cyan/50 hover:bg-accent-cyan/15"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Return to Overview
          </Link>
        </div>
      </div>
    </>
  );
}
