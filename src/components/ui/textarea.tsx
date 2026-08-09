import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-24 w-full resize-y rounded-sm border border-stroke bg-surface px-3 py-2 text-sm text-foreground placeholder:text-grey/70 hover:border-nickel focus-visible:border-electric focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-electric disabled:cursor-not-allowed disabled:bg-beige disabled:opacity-60",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
