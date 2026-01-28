# Form Patterns

## Simple Form with useState

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orpc, queryClient } from "@/utils/orpc";
import { toast } from "sonner";

export function CreateItemForm() {
  const [name, setName] = useState("");

  const mutation = orpc.createItem.useMutation({
    onSuccess: () => {
      toast.success("Created!");
      setName("");
      queryClient.invalidateQueries({ queryKey: ["listItems"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    mutation.mutate({ name });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name"
        />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Creating..." : "Create"}
      </Button>
    </form>
  );
}
```

## Form with TanStack Form + Zod

```tsx
"use client";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orpc, queryClient } from "@/utils/orpc";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
});

export function ItemForm() {
  const mutation = orpc.createItem.useMutation({
    onSuccess: () => {
      toast.success("Created!");
      queryClient.invalidateQueries({ queryKey: ["listItems"] });
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
    },
    onSubmit: async ({ value }) => {
      const result = schema.safeParse(value);
      if (!result.success) {
        toast.error(result.error.errors[0].message);
        return;
      }
      await mutation.mutateAsync(result.data);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field
        name="name"
        children={(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Name</Label>
            <Input
              id={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Enter name"
            />
            {field.state.meta.errors && (
              <p className="text-sm text-destructive">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      />

      <form.Field
        name="description"
        children={(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Description (optional)</Label>
            <Input
              id={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Enter description"
            />
          </div>
        )}
      />

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Creating..." : "Create"}
      </Button>
    </form>
  );
}
```

## Edit Form Pattern

```tsx
"use client";

import { useState, useEffect } from "react";
import { orpc, queryClient } from "@/utils/orpc";
import { toast } from "sonner";

interface EditItemFormProps {
  itemId: string;
}

export function EditItemForm({ itemId }: EditItemFormProps) {
  const { data: item, isLoading } = orpc.getItem.useQuery({
    input: { id: itemId },
  });

  const [name, setName] = useState("");

  // Sync form state when data loads
  useEffect(() => {
    if (item) {
      setName(item.name);
    }
  }, [item]);

  const mutation = orpc.updateItem.useMutation({
    onSuccess: () => {
      toast.success("Updated!");
      queryClient.invalidateQueries({ queryKey: ["listItems"] });
      queryClient.invalidateQueries({ queryKey: ["getItem", itemId] });
    },
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!item) return <div>Item not found</div>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ id: itemId, name });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="submit" disabled={mutation.isPending}>
        Save
      </Button>
    </form>
  );
}
```
