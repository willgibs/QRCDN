import { notFound } from "next/navigation";
import { BRANDS, brandCopy, isBrand } from "@/lib/explore";
import { ExploreChrome } from "@/components/explore/explore-chrome";
import { Hero } from "@/components/explore/hero";
import { StudioSlice } from "@/components/explore/studio-slice";
import { DashboardCard } from "@/components/explore/dashboard-card";
import { PricingPair } from "@/components/explore/pricing-pair";
import { ModuleMark } from "@/components/explore/magic";

export function generateStaticParams() {
  return BRANDS.map((brand) => ({ brand }));
}

export async function generateMetadata(props: PageProps<"/explore/[brand]">) {
  const { brand } = await props.params;
  return {
    title: isBrand(brand)
      ? `Exploration · ${brandCopy[brand].label}`
      : "Exploration",
    robots: { index: false },
  };
}

export default async function ExplorePage(props: PageProps<"/explore/[brand]">) {
  const { brand } = await props.params;
  if (!isBrand(brand)) notFound();

  return (
    <div data-brand={brand} className="min-h-screen bg-background text-foreground">
      <Hero brand={brand} />
      <StudioSlice brand={brand} />
      <DashboardCard />
      <PricingPair brand={brand} />
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm text-muted-foreground">
          <span className="flex items-center gap-2 font-display font-bold text-foreground">
            <ModuleMark className="size-3 text-primary" />
            QRCDN
          </span>
          <span>Exploration — {brandCopy[brand].label}</span>
        </div>
      </footer>
      <ExploreChrome brand={brand} />
    </div>
  );
}
