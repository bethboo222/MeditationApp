import * as React from "react";
import { cn } from "./utils";

// Keep it as a plain function for now (no forwardRef), to avoid type noise.
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
};

export function Button({ className, ...props }: ButtonProps) {
  return (
    <button
      className={cn("px-4 py-2 rounded bg-primary text-primary-foreground", className)}
      {...props}
    />
  );
}
