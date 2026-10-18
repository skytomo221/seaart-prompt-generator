import { useCallback, useLayoutEffect, useRef } from "react";

// Stable event identity across immutable model updates, with the latest committed handler.
export function useStableEvent<Args extends unknown[], Result>(
  handler: (...args: Args) => Result,
) {
  const latest = useRef(handler);
  useLayoutEffect(() => {
    latest.current = handler;
  });
  return useCallback((...args: Args) => latest.current(...args), []);
}
