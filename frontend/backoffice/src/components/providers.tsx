"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { createQueryClient } from "@/lib/queryClient";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => createQueryClient());
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: { fontFamily: "var(--font-sans)" },
        }}
      />
    </QueryClientProvider>
  );
}
