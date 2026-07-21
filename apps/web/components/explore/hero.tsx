"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "./backdrop";
import { ScanNetwork } from "./network";
import { ModuleMark, useRevealVariants } from "./magic";
import { brandCopy, type Brand } from "@/lib/explore";

export function Hero({ brand }: { brand: Brand }) {
  const copy = brandCopy[brand];
  const { container, item } = useRevealVariants();
  const headlineLines = copy.headline.split("\n");

  return (
    <header className="relative overflow-hidden">
      <HeroBackdrop />

      <nav className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
        <span className="flex shrink-0 items-center gap-2.5 font-display text-lg font-bold tracking-tight sm:text-xl">
          <ModuleMark className="size-3.5 text-primary" />
          QRCDN
        </span>
        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          {["Studio", "Pricing", "Docs"].map((label) => (
            <Link
              key={label}
              href="#"
              className="transition-colors duration-200 hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </div>
        <Button size="sm" className="rounded-full">
          {copy.ctaPrimary}
        </Button>
      </nav>

      <motion.div
        className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pt-12 text-center sm:pt-16"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={item}
          className="flex items-center gap-2.5 rounded-full border border-border/70 bg-card/60 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur"
        >
          <ModuleMark />
          {copy.tagline}
        </motion.p>
        <motion.h1
          variants={item}
          className="font-display text-4xl font-semibold leading-[1.05] tracking-tighter sm:text-6xl lg:text-7xl"
        >
          {headlineLines.map((line, i) => (
            <span key={line} className="block">
              {line}
              {i === headlineLines.length - 1 && (
                <span className="text-primary">.</span>
              )}
            </span>
          ))}
        </motion.h1>
        <motion.p
          variants={item}
          className="max-w-xl text-base text-muted-foreground sm:text-lg"
        >
          {copy.sub}
        </motion.p>
        <motion.div
          variants={item}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Button
            size="lg"
            className="group h-12 gap-3 rounded-full py-1.5 pl-6 pr-1.5 text-base shadow-lg shadow-primary/25"
          >
            {copy.ctaPrimary}
            <span className="flex size-9 items-center justify-center rounded-full bg-primary-foreground/15 transition-transform duration-200 ease-(--motion-ease-out) group-hover:translate-x-0.5">
              <ArrowRight className="size-4" />
            </span>
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="h-12 rounded-full px-5 text-base text-muted-foreground hover:text-foreground"
          >
            {copy.ctaSecondary}
          </Button>
        </motion.div>
      </motion.div>

      <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-8 sm:pt-10">
        <ScanNetwork />
      </div>
    </header>
  );
}
