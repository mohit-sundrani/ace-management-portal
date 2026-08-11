import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "border-stroke bg-surface text-foreground placeholder:text-grey/70 hover:border-nickel focus-visible:border-electric focus-visible:outline-electric disabled:bg-beige flex min-h-24 w-full resize-y rounded-sm border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-60",
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
