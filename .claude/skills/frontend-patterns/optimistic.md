# Optimistic Update Patterns

## Delete with Optimistic Update

```tsx
"use client";

import { orpc, queryClient } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const mutation = orpc.deleteItem.useMutation({
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["listItems"] });

      // Snapshot previous value
      const previousItems = queryClient.getQueryData(["listItems"]);

      // Optimistically remove from cache
      queryClient.setQueryData(["listItems"], (old: Item[] | undefined) =>
        old?.filter((item) => item.id !== id)
      );

      return { previousItems };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(["listItems"], context.previousItems);
      }
      toast.error("Failed to delete");
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["listItems"] });
    },
    onSuccess: () => {
      toast.success("Deleted!");
    },
  });

  return (
    <Button
      variant="destructive"
      onClick={() => mutation.mutate({ id: itemId })}
      disabled={mutation.isPending}
    >
      Delete
    </Button>
  );
}
```

## Toggle with Optimistic Update

```tsx
"use client";

import { orpc, queryClient } from "@/utils/orpc";

interface Item {
  id: string;
  name: string;
  completed: boolean;
}

export function ToggleItemButton({ item }: { item: Item }) {
  const mutation = orpc.toggleItem.useMutation({
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["listItems"] });
      const previous = queryClient.getQueryData<Item[]>(["listItems"]);

      queryClient.setQueryData<Item[]>(["listItems"], (old) =>
        old?.map((i) => (i.id === id ? { ...i, completed } : i))
      );

      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["listItems"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["listItems"] });
    },
  });

  return (
    <Checkbox
      checked={item.completed}
      onCheckedChange={(checked) =>
        mutation.mutate({ id: item.id, completed: Boolean(checked) })
      }
    />
  );
}
```

## Create with Optimistic Update

```tsx
"use client";

import { orpc, queryClient } from "@/utils/orpc";

export function useCreateItem() {
  return orpc.createItem.useMutation({
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ["listItems"] });
      const previous = queryClient.getQueryData<Item[]>(["listItems"]);

      // Add optimistic item with temp ID
      const optimisticItem = {
        id: `temp-${Date.now()}`,
        ...newItem,
        createdAt: new Date(),
      };

      queryClient.setQueryData<Item[]>(["listItems"], (old) =>
        old ? [optimisticItem, ...old] : [optimisticItem]
      );

      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["listItems"], context.previous);
      }
      toast.error("Failed to create");
    },
    onSuccess: () => {
      toast.success("Created!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["listItems"] });
    },
  });
}
```

## Guidelines

1. **Always cancel outgoing queries** - Prevents race conditions
2. **Snapshot previous state** - For rollback on error
3. **Rollback on error** - Restore previous state
4. **Refetch on settled** - Ensure server/client consistency
5. **Use temp IDs** - For optimistic creates, prefix with `temp-`
