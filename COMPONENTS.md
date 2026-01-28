# Component Library

UI components available in `src/components/ui/`.

## Button

```tsx
import { Button } from "@/components/ui/button";

// Variants
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><IconComponent /></Button>

// With icon
<Button>
  <PlusIcon data-icon="inline-start" />
  Add Item
</Button>

// Disabled
<Button disabled>Disabled</Button>
```

## Card

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
    <CardAction>
      <Button variant="ghost" size="icon">
        <MoreIcon />
      </Button>
    </CardAction>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Save</Button>
  </CardFooter>
</Card>

// Small variant
<Card size="sm">...</Card>
```

## Input

```tsx
import { Input } from "@/components/ui/input";

<Input placeholder="Enter text..." />
<Input type="email" placeholder="Email" />
<Input type="password" placeholder="Password" />
<Input disabled placeholder="Disabled" />

// With label
<div className="space-y-2">
  <Label htmlFor="name">Name</Label>
  <Input id="name" placeholder="Your name" />
</div>
```

## Label

```tsx
import { Label } from "@/components/ui/label";

<Label htmlFor="email">Email</Label>

// With checkbox
<Label className="flex items-center gap-2">
  <Checkbox />
  Accept terms
</Label>
```

## Checkbox

```tsx
import { Checkbox } from "@/components/ui/checkbox";

<Checkbox />
<Checkbox checked />
<Checkbox disabled />

// Controlled
const [checked, setChecked] = useState(false);
<Checkbox checked={checked} onCheckedChange={setChecked} />
```

## Skeleton

```tsx
import { Skeleton } from "@/components/ui/skeleton";

// Loading placeholder
<Skeleton className="h-4 w-[200px]" />
<Skeleton className="h-12 w-full" />

// Card skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-4 w-[150px]" />
    <Skeleton className="h-3 w-[100px]" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-20 w-full" />
  </CardContent>
</Card>
```

## Loader

```tsx
import Loader from "@/components/loader";

// Full page loader
<Loader />;

// Or use Loader2 icon directly
import { Loader2 } from "lucide-react";
<Loader2 className="animate-spin" />;
```

## DropdownMenu

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

<DropdownMenu>
  <DropdownMenuTrigger>
    <Button variant="outline">Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>Duplicate</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// With checkbox items
<DropdownMenuCheckboxItem checked={showGrid} onCheckedChange={setShowGrid}>
  Show Grid
</DropdownMenuCheckboxItem>

// With submenu
<DropdownMenuSub>
  <DropdownMenuSubTrigger>More Options</DropdownMenuSubTrigger>
  <DropdownMenuSubContent>
    <DropdownMenuItem>Option A</DropdownMenuItem>
    <DropdownMenuItem>Option B</DropdownMenuItem>
  </DropdownMenuSubContent>
</DropdownMenuSub>
```

## Sonner (Toast)

```tsx
import { toast } from "sonner";

// Show notifications
toast.success("Saved successfully");
toast.error("Something went wrong");
toast.info("New update available");
toast.warning("Are you sure?");

// With description
toast.success("File uploaded", {
  description: "Your file has been uploaded successfully",
});

// With action
toast("New message", {
  action: {
    label: "View",
    onClick: () => console.log("View clicked"),
  },
});
```

## Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description text.</DialogDescription>
    </DialogHeader>
    <div>Dialog content here</div>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>;
```

## Sheet

Mobile-friendly bottom/side panel.

```tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Bottom sheet (mobile)
<Sheet>
  <SheetTrigger asChild>
    <Button>Open Sheet</Button>
  </SheetTrigger>
  <SheetContent side="bottom">
    <SheetHeader>
      <SheetTitle>Sheet Title</SheetTitle>
      <SheetDescription>Sheet description.</SheetDescription>
    </SheetHeader>
    <div>Sheet content</div>
  </SheetContent>
</Sheet>

// Side sheet
<SheetContent side="right">...</SheetContent>
<SheetContent side="left">...</SheetContent>
```

## Select

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

<Select>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>;

// Controlled
const [value, setValue] = useState("");
<Select value={value} onValueChange={setValue}>
  ...
</Select>;
```

## Textarea

```tsx
import { Textarea } from "@/components/ui/textarea";

<Textarea placeholder="Enter description..." />
<Textarea rows={5} />
<Textarea disabled />

// With label
<div className="space-y-2">
  <Label htmlFor="notes">Notes</Label>
  <Textarea id="notes" placeholder="Add notes..." />
</div>
```

## Table

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Date</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.status}</TableCell>
        <TableCell>{item.date}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>;
```

## Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">Overview content</TabsContent>
  <TabsContent value="settings">Settings content</TabsContent>
</Tabs>;
```

## Calendar

```tsx
import { Calendar } from "@/components/ui/calendar";

const [date, setDate] = useState<Date | undefined>();

<Calendar mode="single" selected={date} onSelect={setDate} />;
```

## Badge

```tsx
import { Badge } from "@/components/ui/badge";

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

## Progress

```tsx
import { Progress } from "@/components/ui/progress";

<Progress value={33} />
<Progress value={66} className="h-2" />
```

## Switch

```tsx
import { Switch } from "@/components/ui/switch";

<Switch />
<Switch checked />
<Switch disabled />

// Controlled
const [enabled, setEnabled] = useState(false);
<Switch checked={enabled} onCheckedChange={setEnabled} />

// With label
<div className="flex items-center gap-2">
  <Switch id="notifications" />
  <Label htmlFor="notifications">Enable notifications</Label>
</div>
```

## Command

Search and command palette.

```tsx
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

<Command>
  <CommandInput placeholder="Search..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Actions">
      <CommandItem>Create new</CommandItem>
      <CommandItem>Edit</CommandItem>
      <CommandItem>Delete</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>;
```

## Avatar

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

<Avatar>
  <AvatarImage src="/avatar.png" alt="User" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>;
```

## Tooltip

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline">Hover me</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Tooltip text</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>;
```

## Slider

```tsx
import { Slider } from "@/components/ui/slider";

<Slider defaultValue={[50]} max={100} step={1} />;

// Controlled
const [value, setValue] = useState([50]);
<Slider value={value} onValueChange={setValue} />;
```

## Pagination

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#" isActive>
        2
      </PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>
  </PaginationContent>
</Pagination>;
```

## Separator

```tsx
import { Separator } from "@/components/ui/separator";

<Separator />
<Separator orientation="vertical" />
```

## Chart

See `.claude/skills/frontend-patterns/charts.md` for full documentation.

```tsx
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis } from "recharts";

const chartConfig = {
  value: { label: "Value", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

<ChartContainer config={chartConfig} className="h-[300px] w-full">
  <LineChart data={data}>
    <XAxis dataKey="date" />
    <YAxis />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Line dataKey="value" stroke="var(--color-value)" />
  </LineChart>
</ChartContainer>;
```

## Common Patterns

### Form with validation

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { toast } from "sonner";

export function CreateForm() {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    // Submit logic
    toast.success("Created successfully");
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Create New Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit">Create</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
```

### List with loading state

```tsx
"use client";

import { orpc } from "@/utils/orpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ItemList() {
  const { data: items, isLoading } = orpc.listItems.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items?.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <CardTitle>{item.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```
