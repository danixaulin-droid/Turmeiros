import React from "react";
import { cn } from "../../lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "success" | "warning";
  size?: "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
    
    // "Bright Sun" Mode Variants: High contrast, solid borders, no subtle gradients
    const variants = {
      primary: "bg-blue-800 text-white border-b-4 border-blue-950 active:border-b-0 active:translate-y-1 hover:bg-blue-900 shadow-sm",
      secondary: "bg-slate-200 text-slate-900 border-b-4 border-slate-400 active:border-b-0 active:translate-y-1 hover:bg-slate-300",
      danger: "bg-red-700 text-white border-b-4 border-red-900 active:border-b-0 active:translate-y-1 hover:bg-red-800",
      outline: "bg-white text-black border-2 border-black active:bg-gray-100 hover:bg-gray-50",
      success: "bg-green-700 text-white border-b-4 border-green-900 active:border-b-0 active:translate-y-1 hover:bg-green-800",
      warning: "bg-orange-600 text-white border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 hover:bg-orange-700",
    };

    const sizes = {
      sm: "h-10 px-4 text-sm font-bold",
      md: "h-14 px-6 text-base font-bold", // Standard mobile touch target
      lg: "h-16 px-8 text-lg font-bold uppercase tracking-wide",
      xl: "h-20 px-8 text-xl font-black uppercase tracking-wider", // Massive for main actions
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-xl transition-all focus:outline-none focus:ring-4 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none disabled:border-b-0 disabled:translate-y-0 disabled:bg-gray-300 disabled:text-gray-500 disabled:border-gray-400",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-6 w-6 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";