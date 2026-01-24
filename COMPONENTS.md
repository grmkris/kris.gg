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
<Loader />

// Or use Loader2 icon directly
import { Loader2 } from "lucide-react";
<Loader2 className="animate-spin" />
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

## Common Patterns

### Form with validation

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
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
