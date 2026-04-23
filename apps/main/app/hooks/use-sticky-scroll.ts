import { useLayoutEffect, useRef } from "react";

/**
 * Keeps the nearest scrollable ancestor pinned to the bottom of the
 * referenced content. On mount, scrolls to the bottom. When the content
 * grows (e.g. streaming messages), stays pinned only if the user was
 * already near the bottom — scrolling up releases the anchor until the
 * user returns to the bottom.
 */
export function useStickyScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const content = ref.current;
    if (!content) return;

    const scroller = findScrollableAncestor(content);
    if (!scroller) return;

    // Treat the user as "at the bottom" when within a few pixels of it, so
    // sub-pixel rounding and minor layout shifts don't break stickiness.
    const STUCK_THRESHOLD_PX = 32;
    let stuck = true;

    const scrollToBottom = () => {
      scroller.scrollTop = scroller.scrollHeight;
    };

    const updateStuck = () => {
      stuck =
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <=
        STUCK_THRESHOLD_PX;
    };

    scrollToBottom();

    const observer = new ResizeObserver(() => {
      if (stuck) scrollToBottom();
    });
    observer.observe(content);

    scroller.addEventListener("scroll", updateStuck, { passive: true });

    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", updateStuck);
    };
  }, []);

  return ref;
}

function findScrollableAncestor(el: Element): HTMLElement | null {
  let current = el.parentElement;
  while (current) {
    // Per spec, any `overflow-y` value other than `visible` / `hidden`
    // establishes a scroll container — `auto`, `scroll`, `overlay`, and
    // any future values, without a brittle positive-list to maintain.
    const { overflowY } = getComputedStyle(current);
    if (overflowY !== "visible" && overflowY !== "hidden") {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}
