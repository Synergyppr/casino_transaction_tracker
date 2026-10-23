import type { ElementType } from "react";

export function PageHeading({
  title,
  subtitle,
  icon: Icon
}: {
  title: string;
  subtitle: string;
  icon?: ElementType
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        {Icon &&
          <Icon size={17} className="shrink-0 text-accent" />
        }
        <h1 className="text-lg font-semibold text-foreground">
          {title}
        </h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {subtitle}
      </p>
    </div>
  );
}
