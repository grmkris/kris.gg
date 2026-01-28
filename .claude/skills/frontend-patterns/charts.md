# Charts Pattern

## When to Use

Displaying data over time, comparisons, progress tracking.

## Dependencies

Charts use recharts (installed with chart component).

## Imports

```tsx
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
```

## Chart Config

Define colors and labels for each data series:

```tsx
const chartConfig = {
  volume: {
    label: "Volume",
    color: "hsl(var(--chart-1))",
  },
  weight: {
    label: "Weight (kg)",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;
```

## Line Chart (Progress Over Time)

```tsx
const data = [
  { date: "Mon", weight: 100 },
  { date: "Tue", weight: 105 },
  { date: "Wed", weight: 102 },
  { date: "Thu", weight: 108 },
  { date: "Fri", weight: 110 },
];

<ChartContainer config={chartConfig} className="h-[300px] w-full">
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Line
      type="monotone"
      dataKey="weight"
      stroke="var(--color-weight)"
      strokeWidth={2}
    />
  </LineChart>
</ChartContainer>;
```

## Bar Chart (Comparison)

```tsx
const data = [
  { exercise: "Squat", volume: 2000 },
  { exercise: "Bench", volume: 1500 },
  { exercise: "Deadlift", volume: 2500 },
];

<ChartContainer config={chartConfig} className="h-[300px] w-full">
  <BarChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="exercise" />
    <YAxis />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="volume" fill="var(--color-volume)" radius={4} />
  </BarChart>
</ChartContainer>;
```

## Area Chart (Cumulative)

```tsx
<ChartContainer config={chartConfig} className="h-[300px] w-full">
  <AreaChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Area
      type="monotone"
      dataKey="value"
      fill="var(--color-volume)"
      fillOpacity={0.3}
      stroke="var(--color-volume)"
    />
  </AreaChart>
</ChartContainer>
```

## Pie Chart (Distribution)

```tsx
const data = [
  { name: "Chest", value: 30, fill: "hsl(var(--chart-1))" },
  { name: "Back", value: 25, fill: "hsl(var(--chart-2))" },
  { name: "Legs", value: 35, fill: "hsl(var(--chart-3))" },
  { name: "Arms", value: 10, fill: "hsl(var(--chart-4))" },
];

<ChartContainer config={chartConfig} className="h-[300px] w-full">
  <PieChart>
    <ChartTooltip content={<ChartTooltipContent />} />
    <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} />
    <ChartLegend content={<ChartLegendContent />} />
  </PieChart>
</ChartContainer>;
```

## With Loading State

```tsx
"use client";

import { orpc } from "@/utils/orpc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

export function ProgressChart() {
  const { data, isLoading } = orpc.getProgress.useQuery();

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="value" stroke="var(--color-volume)" />
      </LineChart>
    </ChartContainer>
  );
}
```

## Multiple Series

```tsx
const chartConfig = {
  squat: { label: "Squat", color: "hsl(var(--chart-1))" },
  bench: { label: "Bench", color: "hsl(var(--chart-2))" },
  deadlift: { label: "Deadlift", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

<ChartContainer config={chartConfig} className="h-[300px] w-full">
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <ChartTooltip content={<ChartTooltipContent />} />
    <ChartLegend content={<ChartLegendContent />} />
    <Line type="monotone" dataKey="squat" stroke="var(--color-squat)" />
    <Line type="monotone" dataKey="bench" stroke="var(--color-bench)" />
    <Line type="monotone" dataKey="deadlift" stroke="var(--color-deadlift)" />
  </LineChart>
</ChartContainer>;
```

## Chart Colors

Available CSS variables:

- `--chart-1` to `--chart-5` for different series
- Use `hsl(var(--chart-N))` in config

## Mobile Responsive

Charts are responsive by default with `w-full`. Control height:

```tsx
// Smaller on mobile
<ChartContainer config={chartConfig} className="h-[200px] md:h-[300px] w-full">
```
