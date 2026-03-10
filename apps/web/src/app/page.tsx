import { LandingContent } from '@/components/marketing/landing-content';
import { LandingHero } from '@/components/marketing/landing-hero';

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(245,166,35,0.22),transparent_18%),radial-gradient(circle_at_85%_10%,rgba(59,130,246,0.14),transparent_22%),linear-gradient(180deg,#0c1220_0%,#080c14_52%,#060910_100%)] px-5 py-6 text-[var(--color-foreground)] md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12">
        <LandingHero />
        <LandingContent />
      </div>
    </main>
  );
}
