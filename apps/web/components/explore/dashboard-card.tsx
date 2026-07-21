"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, Reveal } from "./magic";

const scans = [
  { day: "Jun 22", scans: 214 },
  { day: "Jun 25", scans: 310 },
  { day: "Jun 28", scans: 289 },
  { day: "Jul 1", scans: 405 },
  { day: "Jul 4", scans: 612 },
  { day: "Jul 7", scans: 528 },
  { day: "Jul 10", scans: 719 },
  { day: "Jul 13", scans: 833 },
  { day: "Jul 16", scans: 780 },
  { day: "Jul 19", scans: 941 },
];

const chartConfig = {
  scans: { label: "Scans", color: "var(--chart-1)" },
} satisfies ChartConfig;

const topCodes = [
  { name: "Summer menu", slug: "K7M2X9A", scans: "4,182", country: "US" },
  { name: "Poster · Tour", slug: "B3TWQ8N", scans: "2,914", country: "DE" },
  { name: "Packaging insert", slug: "H9RFD2M", scans: "1,506", country: "GB" },
];

export function DashboardCard() {
  return (
    <section className="border-b">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="mb-10 max-w-xl">
          <Eyebrow>Analytics</Eyebrow>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            Know every scan
          </h2>
          <p className="mt-2 text-muted-foreground">
            Volume, geography, and devices for every dynamic code — and the
            destination stays editable after printing.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Scans · last 30 days</CardTitle>
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="size-3" /> +38%
              </Badge>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <AreaChart data={scans} margin={{ left: 4, right: 4 }}>
                  <defs>
                    <linearGradient id="scansFade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-scans)" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="var(--color-scans)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval="preserveStartEnd"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="scans"
                    type="monotone"
                    fill="url(#scansFade)"
                    stroke="var(--color-scans)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-6">
              <Card className="shadow-sm transition-transform hover:-translate-y-0.5">
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">Total scans</p>
                  <p className="font-display text-2xl font-bold">12,482</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm transition-transform hover:-translate-y-0.5">
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">Top country</p>
                  <p className="font-display text-2xl font-bold">US · 41%</p>
                </CardContent>
              </Card>
            </div>
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-base">Top codes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Scans</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCodes.map((code) => (
                      <TableRow key={code.slug}>
                        <TableCell>
                          <span className="block text-sm">{code.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            /{code.slug}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {code.scans}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
