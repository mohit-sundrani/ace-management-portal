import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
    [
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer",
        "transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-in-out",
        "hover:scale-105 active:scale-[0.98] motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric",
        "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
        "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    ].join(" "),
    {
        variants: {
            variant: {
                // The single violet fill: one primary action per view.
                default: "rounded-md bg-electric text-white hover:shadow-dropdown",
                outline:
                    "rounded-sm border border-stroke bg-surface text-foreground hover:border-nickel hover:shadow-dropdown",
                secondary: "rounded-sm border border-stroke bg-beige text-foreground hover:border-nickel",
                ghost: "rounded-sm text-grey hover:bg-beige hover:text-foreground hover:scale-100",
                destructive: "rounded-sm border border-danger/40 bg-danger/5 text-danger hover:bg-danger/10",
                link: "text-electric underline-offset-4 hover:underline hover:scale-100",
            },
            size: {
                default: "h-9 px-4 py-2 text-sm",
                sm: "h-8 px-3 py-1.5 text-xs",
                lg: "h-10 px-6 text-sm",
                icon: "size-8 rounded-sm",
            },
        },
        defaultVariants: {
            variant: "outline",
            size: "default",
        },
    },
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
    },
);
Button.displayName = "Button";

export { Button, buttonVariants };
