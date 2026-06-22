"use client";

import { useSearchParams } from "next/navigation";

export function readPresentationModeFromSearch(search: string | URLSearchParams | null | undefined) {
  if (!search) {
    return false;
  }

  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return params.get("presentazione") === "1";
}

export function usePresentationMode() {
  const searchParams = useSearchParams();
  return readPresentationModeFromSearch(searchParams);
}
