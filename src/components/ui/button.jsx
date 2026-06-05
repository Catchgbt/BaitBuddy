import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95 active:opacity-90",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow active:bg-primary/95 focus-visible:ring-primary",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm active:bg-destructive/95 focus-visible:ring-destructive",
        outline:
          "border border-input bg-background shadow-sm active:bg-accent active:text-accent-foreground focus-visible:ring-gray-400",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm active:bg-secondary/70 focus-visible:ring-secondary",
        ghost: "active:bg-accent active:text-accent-foreground focus-visible:ring-gray-400",
        link: "text-primary underline-offset-4 active:opacity-70 focus-visible:ring-primary",
      },
      size: {
        default: "h-11 px-4 py-2 min-h-[44px]",
        sm: "h-10 rounded-md px-3 text-xs min-h-[40px]",
        lg: "h-12 rounded-md px-8 min-h-[48px]",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }