"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Select do shadcn utilizável dentro de <form action={...}> de server
// component: o Base UI emite um input oculto com `name`, então o valor
// chega no FormData normalmente.

export interface FormSelectOption {
  value: string;
  label: string;
}

export function FormSelect({
  id,
  name,
  options,
  defaultValue,
  className,
  onValueChange,
}: {
  id?: string;
  name: string;
  options: FormSelectOption[];
  defaultValue?: string;
  className?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <Select
      name={name}
      items={options}
      defaultValue={defaultValue ?? options[0]?.value}
      onValueChange={
        onValueChange ? (value) => onValueChange(value ?? "") : undefined
      }
    >
      <SelectTrigger id={id} className={cn("h-9 w-full", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
