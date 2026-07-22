import { notFound } from "next/navigation";
import Link from "next/link";
import { BRANDS, brandCopy, isBrand } from "@/lib/explore";
import { ExploreChrome } from "@/components/explore/explore-chrome";
import { Hero } from "@/components/explore/hero";
import { StudioSlice } from "@/components/explore/studio-slice";
import { StudioWindow } from "@/components/explore/studio-window";
import { DashboardCard } from "@/components/explore/dashboard-card";
import { PricingPair } from "@/components/explore/pricing-pair";
import { ModuleMark, Reveal } from "@/components/brand/magic";

const FOOTER_COLUMNS = [
  { title: "Product", links: ["Studio", "Pricing", "Docs"] },
  { title: "Company", links: ["About", "Blog", "Contact"] },
  { title: "Legal", links: ["Privacy", "Terms"] },
] as const;

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
    <div className="min-h-screen bg-background text-foreground">
      <Hero brand={brand} />
      <section className="relative border-b">
        <div className="mx-auto max-w-5xl px-6 pb-24 -mt-4">
          <Reveal><StudioWindow /></Reveal>
        </div>
      </section>
      <StudioSlice brand={brand} />
      <DashboardCard />
      <PricingPair brand={brand} />
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 font-display font-bold text-foreground">
                <ModuleMark className="size-3 text-primary" />
                QRCDN
              </span>
              <p className="font-mono text-xs text-muted-foreground">
                QR infrastructure, engineered.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-8 sm:gap-16">
              {FOOTER_COLUMNS.map((col) => (
                <div key={col.title} className="flex flex-col gap-3">
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {col.title}
                  </span>
                  {col.links.map((label) => (
                    <Link
                      key={label}
                      href="#"
                      className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border/60 pt-6 font-mono text-xs text-muted-foreground sm:flex-row sm:items-center">
            <span>© 2026 QRCDN</span>
            <span>your code never dies</span>
          </div>
        </div>
      </footer>
      <ExploreChrome />
    </div>
  );
}
