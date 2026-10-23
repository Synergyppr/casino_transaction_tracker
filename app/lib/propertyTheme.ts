import { capitalizePropertyName } from "./propertyName";
export const SELECTED_PROPERTY_KEY = "casino_selected_property";
export const PROPERTY_THEME_OVERRIDES_KEY = "casino_property_theme_overrides";

export interface PropertyTheme {
  primary: string;
  secondary: string;
}

export interface SelectedProperty {
  id: string;
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export type PropertyThemeOverrides = Record<string, PropertyTheme>;

export function getPropertyThemeOverrides(): PropertyThemeOverrides {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PROPERTY_THEME_OVERRIDES_KEY) || "{}") as PropertyThemeOverrides;
  } catch {
    return {};
  }
}

export function savePropertyThemeOverride(propertyId: string, theme: PropertyTheme) {
  const overrides = getPropertyThemeOverrides();
  overrides[propertyId] = theme;
  localStorage.setItem(PROPERTY_THEME_OVERRIDES_KEY, JSON.stringify(overrides));
}

const PROPERTY_PALETTES: Array<PropertyTheme & { matches: string[] }> = [
  {
    matches: ["condado ocean club", "coc"],
    primary: "#22b8f0",
    secondary: "#102b3a",
  },
  {
    matches: ["condado vanderbilt", "cvh", "vanderbilt"],
    primary: "#d7a84b",
    secondary: "#302713",
  },
  {
    matches: ["la concha", "lcr", "concha"],
    primary: "#ec4899",
    secondary: "#351528",
  },
  {
    matches: ["caribe hilton", "crh", "caribe"],
    primary: "#2dd4bf",
    secondary: "#10312f",
  },
];

const FALLBACK_PALETTES: PropertyTheme[] = [
  { primary: "#4f6ef7", secondary: "#151d2e" },
  { primary: "#8b5cf6", secondary: "#251a3d" },
  { primary: "#f97316", secondary: "#382012" },
  { primary: "#10b981", secondary: "#103126" },
];

function stableIndex(value: string, length: number) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash % length;
}

export function getDefaultPropertyTheme(property: Pick<SelectedProperty, "id" | "name"> &
  Partial<SelectedProperty>): PropertyTheme {
  if (property.primaryColor && property.secondaryColor) {
    return { primary: property.primaryColor, secondary: property.secondaryColor };
  }

  const searchable = `${property.id} ${property.name}`.toLowerCase();
  const namedPalette = PROPERTY_PALETTES.find(({ matches }) =>
    matches.some((match) => searchable.includes(match))
  );

  return namedPalette ?? FALLBACK_PALETTES[stableIndex(searchable, FALLBACK_PALETTES.length)];
}

export function getPropertyTheme(property: Pick<SelectedProperty, "id" | "name"> &
  Partial<SelectedProperty>): PropertyTheme {
  return getPropertyThemeOverrides()[property.id] ?? getDefaultPropertyTheme(property);
}

export function saveSelectedProperty(property: SelectedProperty) {
  const theme = getPropertyTheme(property);
  sessionStorage.setItem(
    SELECTED_PROPERTY_KEY,
    JSON.stringify({
      ...property,
      name: capitalizePropertyName(property.name),
      primaryColor: property.primaryColor ?? theme.primary,
      secondaryColor: property.secondaryColor ?? theme.secondary,
    })
  );
}

export function getSelectedProperty(): SelectedProperty | null {
  try {
    const raw = sessionStorage.getItem(SELECTED_PROPERTY_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") return { id: parsed, name: "Property" };
    if (!parsed || typeof parsed !== "object" || !("id" in parsed)) return null;
    const property = parsed as SelectedProperty;
    return {...property, name: capitalizePropertyName(property.name)};
  } catch {
    return null;
  }
}

export function applyPropertyTheme(property: SelectedProperty | null) {
  const root = document.documentElement;
  const theme = property
    ? getPropertyTheme(property)
    : { primary: "#4f6ef7", secondary: "#151d2e" };

  root.style.setProperty("--accent", theme.primary);
  root.style.setProperty("--secondary", theme.secondary);
  root.style.setProperty("--input-background", theme.secondary);
  root.style.setProperty("--sidebar-primary", theme.primary);
  root.style.setProperty("--sidebar-accent", theme.secondary);
  root.style.setProperty("--chart-1", theme.primary);
  root.style.setProperty("--ring", `color-mix(in srgb, ${theme.primary} 45%, transparent)`);
}
