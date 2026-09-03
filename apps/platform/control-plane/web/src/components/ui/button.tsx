import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-zinc-950 text-white hover:bg-zinc-800",
        ghost: "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
        outline: "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100",
      },
      size: {
        default: "h-10 px-4",
        icon: "size-10 p-0",
        sm: "h-8 px-3",
      },
    },
    defaultVariants: { size: "default", variant: "default" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ asChild, className, size, variant, ...props }, ref) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ className, size, variant }))} ref={ref} {...props} />;
});
