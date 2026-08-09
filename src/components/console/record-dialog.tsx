import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type FieldOption = { value: string; label: string };

export type Field = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "time" | "select" | "switch";
  options?: ReadonlyArray<FieldOption>;
  required?: boolean;
  placeholder?: string;
  help?: string;
  full?: boolean;
};

export type FormValues = Record<string, string | boolean>;

const NONE = "__none__";

const toFormValue = (value: unknown): string | boolean => {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return "";
  return String(value);
};

/** Turns form strings back into database-ready values. */
const toRecord = (fields: ReadonlyArray<Field>, values: FormValues): Record<string, unknown> => {
  const output: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = values[field.name];
    if (field.type === "switch") {
      output[field.name] = Boolean(raw);
      continue;
    }
    const text = typeof raw === "string" ? raw.trim() : "";
    if (text === "" || text === NONE) {
      output[field.name] = field.required ? "" : null;
      continue;
    }
    output[field.name] = field.type === "number" ? Number(text) : text;
  }
  return output;
};

export function buildValues(
  fields: ReadonlyArray<Field>,
  source?: Record<string, unknown> | null,
): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    values[field.name] =
      field.type === "switch"
        ? Boolean(source?.[field.name] ?? false)
        : toFormValue(source?.[field.name]);
  }
  return values;
}

export function RecordDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  submitLabel = "Save",
  busy = false,
  extra,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: ReadonlyArray<Field>;
  initial?: Record<string, unknown> | null;
  submitLabel?: string;
  busy?: boolean;
  extra?: ReactNode;
  onSubmit: (values: Record<string, unknown>) => void;
}) {
  const [values, setValues] = useState<FormValues>(() => buildValues(fields, initial));

  useEffect(() => {
    if (open) setValues(buildValues(fields, initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const canSubmit = useMemo(
    () =>
      fields.every((field) => {
        if (!field.required) return true;
        const value = values[field.name];
        return typeof value === "boolean" ? true : Boolean(value && value !== NONE);
      }),
    [fields, values],
  );

  const set = (name: string, value: string | boolean) =>
    setValues((current) => ({ ...current, [name]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(toRecord(fields, values));
          }}
        >
          {fields.map((field) => {
            const id = `field-${field.name}`;
            const value = values[field.name];
            return (
              <div
                key={field.name}
                className={cn(
                  "space-y-2",
                  (field.full || field.type === "textarea") && "sm:col-span-2",
                )}
              >
                {field.type === "switch" ? (
                  <div className="flex items-center justify-between rounded-sm border border-stroke px-3 py-2.5">
                    <Label htmlFor={id}>{field.label}</Label>
                    <Switch
                      id={id}
                      checked={Boolean(value)}
                      onCheckedChange={(checked) => set(field.name, checked)}
                    />
                  </div>
                ) : (
                  <>
                    <Label htmlFor={id}>
                      {field.label}
                      {field.required ? <span className="text-danger"> *</span> : null}
                    </Label>
                    {field.type === "textarea" ? (
                      <Textarea
                        id={id}
                        rows={3}
                        placeholder={field.placeholder}
                        value={String(value ?? "")}
                        onChange={(event) => set(field.name, event.target.value)}
                      />
                    ) : field.type === "select" ? (
                      <Select
                        value={String(value || NONE)}
                        onValueChange={(next) => set(field.name, next)}
                      >
                        <SelectTrigger id={id}>
                          <SelectValue placeholder={field.placeholder ?? "Select"} />
                        </SelectTrigger>
                        <SelectContent>
                          {!field.required ? <SelectItem value={NONE}>None</SelectItem> : null}
                          {(field.options ?? []).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={id}
                        type={
                          field.type === "number"
                            ? "number"
                            : field.type === "date"
                              ? "date"
                              : field.type === "time"
                                ? "time"
                                : "text"
                        }
                        step={field.type === "number" ? "0.01" : undefined}
                        placeholder={field.placeholder}
                        value={String(value ?? "")}
                        onChange={(event) => set(field.name, event.target.value)}
                      />
                    )}
                    {field.help ? <p className="text-xs text-grey">{field.help}</p> : null}
                  </>
                )}
              </div>
            );
          })}

          {extra ? <div className="sm:col-span-2">{extra}</div> : null}

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || busy}>
              {busy ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
