# Data Fetching Patterns

## Query Pattern

```tsx
"use client";

import { orpc } from "@/utils/orpc";
import { Skeleton } from "@/components/ui/skeleton";

export default function ItemsPage() {
  const { data: items, isLoading, error } = orpc.listItems.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Error: {error.message}</div>;
  }

  if (!items?.length) {
    return <div className="text-muted-foreground">No items found</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

## Query with Parameters

```tsx
const { data: item } = orpc.getItem.useQuery({ input: { id: itemId } });
```

## Mutation Pattern

```tsx
"use client";

import { orpc, queryClient } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CreateItemButton() {
  const mutation = orpc.createItem.useMutation({
    onSuccess: () => {
      toast.success("Item created!");
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["listItems"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Button
      onClick={() => mutation.mutate({ name: "New Item" })}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? "Creating..." : "Create Item"}
    </Button>
  );
}
```

## Loading States

```tsx
import { Loader2 } from "lucide-react";

<Button disabled={mutation.isPending}>
  {mutation.isPending ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Saving...
    </>
  ) : (
    "Save"
  )}
</Button>;
```

## Cache Invalidation

```tsx
import { queryClient } from "@/utils/orpc";

// Invalidate single query
queryClient.invalidateQueries({ queryKey: ["listItems"] });

// Invalidate multiple queries
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ["listItems"] }),
  queryClient.invalidateQueries({ queryKey: ["getItem", itemId] }),
]);

// Or use refetch directly
const { refetch } = orpc.listItems.useQuery();
await refetch();
```

## Server Component Pattern (for SEO)

```tsx
// page.tsx (Server Component)
import { client } from "@/utils/orpc";
import { ItemList } from "./item-list";

export default async function Page() {
  const items = await client.listItems();
  return <ItemList initialData={items} />;
}

// item-list.tsx (Client Component)
("use client");

import { orpc } from "@/utils/orpc";

interface ItemListProps {
  initialData: Awaited<ReturnType<typeof client.listItems>>;
}

export function ItemList({ initialData }: ItemListProps) {
  const { data: items } = orpc.listItems.useQuery({
    initialData,
  });

  return (
    <div>
      {items?.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

## Error Handling

```tsx
const mutation = orpc.createItem.useMutation({
  onError: (error) => {
    // Check for specific error codes
    if (error.message.includes("NOT_FOUND")) {
      toast.error("Item not found");
    } else if (error.message.includes("UNAUTHORIZED")) {
      toast.error("Please sign in");
    } else {
      toast.error(error.message || "Something went wrong");
    }
  },
});
```
