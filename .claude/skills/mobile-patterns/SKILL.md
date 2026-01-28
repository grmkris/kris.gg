# Mobile-First Patterns

## When to Use

Building any UI - default to mobile-first approach.

## Core Principles

1. **Touch targets**: min 44x44px
2. **Stack on mobile, grid on desktop**
3. **Bottom actions on mobile**
4. **Use `container px-4` for spacing**
5. **Test at 375px width (iPhone SE)**

## Responsive Layout

```tsx
<div className="container px-4 py-6 md:px-6">
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {items.map((item) => (
      <Card key={item.id}>...</Card>
    ))}
  </div>
</div>
```

## Touch-Friendly Buttons

```tsx
// Mobile: full width, Desktop: auto
<Button className="w-full md:w-auto">Save</Button>

// Large touch target
<Button size="lg" className="h-12 text-base">
  Submit
</Button>
```

## Mobile Bottom Action (Sheet)

```tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Fixed bottom button that opens Sheet
<Sheet>
  <SheetTrigger asChild>
    <Button className="fixed bottom-4 right-4 md:hidden h-14 w-14 rounded-full">
      <PlusIcon />
    </Button>
  </SheetTrigger>
  <SheetContent side="bottom" className="h-auto">
    <SheetHeader>
      <SheetTitle>Add New Item</SheetTitle>
    </SheetHeader>
    <AddForm />
  </SheetContent>
</Sheet>;
```

## Form Inputs

```tsx
// Larger touch targets on mobile
<Input className="h-12 text-base md:h-10 md:text-sm" />

// Full width on mobile
<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="name">Name</Label>
    <Input id="name" className="h-12 md:h-10" />
  </div>
  <Button className="w-full md:w-auto">Save</Button>
</div>
```

## Responsive Navigation

```tsx
// Desktop: horizontal, Mobile: vertical in Sheet
<nav className="hidden md:flex gap-4">
  <Link href="/dashboard">Dashboard</Link>
  <Link href="/settings">Settings</Link>
</nav>

// Mobile hamburger
<Sheet>
  <SheetTrigger asChild className="md:hidden">
    <Button variant="ghost" size="icon">
      <MenuIcon />
    </Button>
  </SheetTrigger>
  <SheetContent side="left">
    <nav className="flex flex-col gap-4 mt-8">
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/settings">Settings</Link>
    </nav>
  </SheetContent>
</Sheet>
```

## Card Grid

```tsx
// 1 column mobile, 2 tablet, 3 desktop
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {items.map((item) => (
    <Card key={item.id}>
      <CardHeader>
        <CardTitle className="text-lg">{item.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{item.description}</p>
      </CardContent>
    </Card>
  ))}
</div>
```

## Sticky Header

```tsx
<header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
  <div className="container flex h-14 items-center px-4">
    <h1 className="text-lg font-semibold">Page Title</h1>
  </div>
</header>
```

## Key Classes

| Pattern             | Classes                                    |
| ------------------- | ------------------------------------------ |
| Container           | `container px-4 md:px-6`                   |
| Touch button        | `h-12 text-base`                           |
| Mobile full-width   | `w-full md:w-auto`                         |
| Hide on mobile      | `hidden md:block`                          |
| Show on mobile only | `md:hidden`                                |
| Responsive grid     | `grid gap-4 md:grid-cols-2 lg:grid-cols-3` |
| Bottom fixed        | `fixed bottom-4 right-4 md:hidden`         |
