"use client";

interface FormFieldErrorProps {
  message?: string;
}

export default function FormFieldError({ message }: FormFieldErrorProps) {
  if (!message) return null;
  return <p className="text-sm text-error-red mt-1">{message}</p>;
}