"use client";

import { Toaster } from "sonner";

export function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: "white",
          border: "1px solid #e2e8f0",
        },
        className: "shadow-lg",
      }}
      richColors
      closeButton
    />
  );
}
