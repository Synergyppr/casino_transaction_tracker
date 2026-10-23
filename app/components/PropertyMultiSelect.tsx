"use client";
import { useState } from "react";
import { Building2, Check, Search } from "lucide-react";
import type { Property } from "../lib/api";

export function PropertyMultiSelect({
  properties,
  value,
  onChange,
  disabled,
  loading,
  error,
  onRetry
}: {
  properties: Property[];
  value?: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
  loading: boolean;
  error: string;
  onRetry: () => void
}) {
  const [search, setSearch] = useState("");
  const selected = value || [];
  const unknown = selected.filter(id => !properties.some(property => property.id === id));

  const allPropertyIds = [...new Set([
    ...properties.map(property => property.id),
    ...unknown,
  ])];
  const allSelected = allPropertyIds.length > 0 &&
    allPropertyIds.every(id => selected.includes(id));
  const partiallySelected = selected.length > 0 && !allSelected;

  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Building2 size={14} />
        Properties
        <span className="rounded-full bg-accent/15 px-2 text-accent">
          {selected.length} selected
        </span>
      </legend>
      <div className="rounded-lg border border-border bg-secondary/30 p-2">
        <label className="flex items-center gap-2 rounded border border-border px-2">
          <Search size={14} />
          <input
            aria-label="Search properties"
            placeholder="Search properties..."
            className="min-w-0 w-full bg-transparent py-2 text-sm outline-none"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </label>
        <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm hover:bg-secondary">
          <input
            type="checkbox"
            className="accent-accent"
            checked={allSelected}
            ref={input => {
              if (input) input.indeterminate = partiallySelected;
            }}
            disabled={loading || !!error || allPropertyIds.length === 0}
            onChange={event =>
              onChange(event.target.checked ? allPropertyIds : [])
            }
          />
          <span>Select all properties</span>
        </label>
        <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
          {loading &&
            <p className="p-2 text-xs text-muted-foreground">
              Loading properties...
            </p>
          }
          {error &&
            <p className="p-2 text-xs text-destructive">
              {error}
              <button type="button" onClick={onRetry} className="underline">
                Retry
              </button>
            </p>
          }
          {properties
            .filter(property => property.name.toLowerCase().includes(search.toLowerCase())).map(property =>
              <label key={property.id}
                className={`flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm ${selected.includes(property.id) ? "bg-accent/15 text-accent" : "hover:bg-secondary"}`}>
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={selected.includes(property.id)}
                  onChange={event =>
                    onChange(event.target.checked ? [...selected, property.id] : selected.filter(id => id !== property.id))
                  }
                />
                <span className="min-w-0 flex-1 wrap-break-word">
                  {property.name}
                </span>
                {selected.includes(property.id) && <Check size={14} />}
              </label>
            )}
          {unknown.map(id =>
            <label key={id} className="flex gap-2 p-2 text-xs break-all">
              <input type="checkbox" checked
                onChange={() =>
                  onChange(selected.filter(item => item !== id))}
              />{id}
            </label>
          )}
          {!loading && !error && !properties.length &&
            <p className="p-2 text-xs">No properties available.</p>}
        </div>
      </div>
      {value === undefined &&
        <p className="text-xs text-muted-foreground">
          Existing assignments were not returned by the API. Choose properties to change them; otherwise they are preserved.
        </p>
      }
    </fieldset>
  );
}
