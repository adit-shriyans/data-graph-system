"use client";

import { useMutation } from "@tanstack/react-query";
import type { ChatRequest, ChatResponse } from "@/types";

export function useChat() {
  return useMutation<ChatResponse, Error, ChatRequest>({
    mutationFn: async (req) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || "Request failed");
      }
      return res.json();
    },
  });
}
