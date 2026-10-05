"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

const variants = {
  primary: "bg-stone-900 text-white hover:bg-stone-700",
  secondary: "border border-stone-300 bg-white hover:bg-stone-50",
  danger: "text-red-600 hover:bg-red-50",
  ghost: "text-stone-600 hover:bg-stone-100",
};

export function SubmitButton({
  variant = "primary",
  className = "",
  children,
  confirm,
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof variants; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      type="submit"
      disabled={pending || props.disabled}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
        props.onClick?.(e);
      }}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
