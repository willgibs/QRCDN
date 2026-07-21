"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QrSvg } from "./qr-svg";
import { HeroBackdrop } from "./backdrop";
import { RetargetDemo } from "./retarget-demo";
import { ModuleMark, useRevealVariants } from "./magic";
import { brandCopy, brandQrStyles, type Brand } from "@/lib/explore";

export function Hero({ brand }: { brand: Brand }) {
  const copy = brandCopy[brand];
  const qr = brandQrStyles[brand];
  const { container, item } = useRevealVariants();
  const headlineLines = copy.headline.split("\n");

  return (
    <header className="relative">
      <HeroBackdrop />

      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight">
          <ModuleMark className="size-3.5 text-primary" />
          QRCDN
        </span>
        <div className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
          {["Studio", "Pricing", "Docs"].map((label) => (
            <Link
              key={label}
              href="#"
              className="transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </div>
        <Button size="sm" className="rounded-full">
          {copy.ctaPrimary}
        </Button>
      </nav>

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
        <motion.div
          className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            variants={item}
            className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground"
          >
            <ModuleMark />
            {copy.tagline}
          </motion.p>
          <motion.h1
            variants={item}
            className="font-display text-5xl font-semibold leading-[1.04] tracking-tighter sm:text-6xl xl:text-7xl"
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
            className="max-w-lg text-lg text-muted-foreground sm:text-xl"
          >
            {copy.sub}
          </motion.p>
          <motion.div
            variants={item}
            className="flex flex-wrap items-center justify-center gap-4 lg:justify-start"
          >
            <Button
              size="lg"
              className="h-12 rounded-full px-7 text-base shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40 hover:brightness-110"
            >
              {copy.ctaPrimary}
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-12 rounded-full px-5 text-base text-muted-foreground hover:text-foreground"
            >
              {copy.ctaSecondary}
            </Button>
          </motion.div>
          <motion.p
            variants={item}
            className="font-mono text-xs text-muted-foreground/80"
          >
            your code never dies — free codes redirect forever
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-[24rem]"
        >
          <div className="rounded-[28px] bg-gradient-to-b from-primary/45 via-border/70 to-border/30 p-px shadow-2xl shadow-primary/15">
            <div className="flex flex-col gap-4 rounded-[27px] bg-card/85 p-6 backdrop-blur-xl">
              <div className="rounded-2xl bg-qr-bg p-4">
                <QrSvg
                  data="HTTPS://QRCDN.COM/K7M2X9A"
                  light={qr.light}
                  dark={qr.dark}
                  className="[&_svg]:h-auto [&_svg]:w-full"
                />
              </div>
              <RetargetDemo />
            </div>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
