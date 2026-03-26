import { LandingContent } from '@/components/marketing/landing-content';
import { LandingHero } from '@/components/marketing/landing-hero';
import { LandingMethodology } from '@/components/marketing/landing-methodology';

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 pb-12 pt-12 md:px-10 md:pb-16 md:pt-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-20">
        <LandingHero />
        <LandingMethodology />
        <LandingContent />
      </div>
    </main>
  );
}
