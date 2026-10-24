import React from "react";
import { Spinner } from "./Spinner";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-md focus-visible:outline-2 focus-visible:outline-[#1F1D1A] focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const sizeStyles = {
    sm: "text-xs px-2.5 py-1 gap-1.5 h-7",
    md: "text-xs px-3.5 py-1.5 gap-2 h-8",
    lg: "text-sm px-4 py-2 gap-2 h-9",
  };

  const variantStyles = {
    primary:
      "bg-[#1F1D1A] text-[#FFFFFF] hover:bg-[#2E2A27] active:bg-[#141311] border border-transparent shadow-subtle",
    secondary:
      "bg-[#FFFFFF] text-[#1F1D1A] border border-[#E5E1D8] hover:bg-[#FAF8F4] active:bg-[#F0ECE3] shadow-subtle",
    ghost:
      "bg-transparent text-[#1F1D1A] hover:bg-[#F0ECE3] active:bg-[#E5E1D8] border border-transparent",
    danger:
      "bg-[#FFFFFF] text-[#B5483A] border border-[#B5483A] hover:bg-[#FAF0EE] active:bg-[#F3E2DF]",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Spinner
          size="sm"
          className={variant === "primary" ? "text-white" : "text-[#1F1D1A]"}
        />
      ) : null}
      {children}
    </button>
  );
}
