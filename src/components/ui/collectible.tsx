import type { SVGProps } from "react";

export function Collectible({ className, ...props }: SVGProps<SVGSVGElement>) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M12 2l3 6 6 .9-4.6 4.3.6 6.1L12 17.4l-5.6 3 .6-6.1L3 8.9l6-.9L12 2z" />
        </svg>
    );
}
