import { useSyncExternalStore } from "react";

export function useIsClientReady() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function useBrowserOrigin() {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
}

export function useAbsoluteAppUrl(path: string) {
  const origin = useBrowserOrigin();
  return origin ? `${origin}${path}` : path;
}
