import { LandingContent } from '@/components/marketing/landing-content';
import { LandingHero } from '@/components/marketing/landing-hero';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black px-5 pb-10 pt-8 md:px-8 md:pb-12 md:pt-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16">
        <LandingHero />
        <LandingContent />
      </div>
    </main>
  );
}
