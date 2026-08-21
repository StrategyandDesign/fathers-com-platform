"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

import {
  CATALOG_SCROLL_PEEK,
  CATALOG_VISIBLE_ROWS,
  catalogNeedsScroll,
  catalogScrollAtEnd,
  catalogScrollMaxHeight,
} from "@/lib/manager/catalog-scroll";
import { cn } from "@/lib/utils";

export function CatalogScrollList({
  count,
  label,
  children,
}: {
  count: number;
  label: string;
  children: React.ReactNode;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const scrollable = catalogNeedsScroll(count);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const [showFade, setShowFade] = useState(scrollable);

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list || !catalogNeedsScroll(count)) {
      setMaxHeight(null);
      setShowFade(false);
      return;
    }
    const rows = Array.from(list.children).map((row) => ({
      offsetTop: (row as HTMLElement).offsetTop,
      offsetHeight: (row as HTMLElement).offsetHeight,
    }));
    setMaxHeight(catalogScrollMaxHeight(rows, CATALOG_VISIBLE_ROWS, CATALOG_SCROLL_PEEK));
    setShowFade(!catalogScrollAtEnd(list.scrollTop, list.clientHeight, list.scrollHeight));
  }, [count]);

  useLayoutEffect(() => {
    measure();
    const list = listRef.current;
    if (!list || !scrollable) return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const child of list.children) observer.observe(child);
    return () => observer.disconnect();
  }, [measure, scrollable]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      <ul
        ref={listRef}
        tabIndex={scrollable ? 0 : undefined}
        aria-label={scrollable ? label : undefined}
        onScroll={(event) => {
          const list = event.currentTarget;
          setShowFade(!catalogScrollAtEnd(list.scrollTop, list.clientHeight, list.scrollHeight));
        }}
        style={maxHeight ? { maxHeight } : undefined}
        className={cn(
          "divide-y divide-border",
          scrollable &&
            "brand-scroll max-h-[min(42rem,calc(100dvh-12rem))] overflow-y-auto overscroll-contain"
        )}
      >
        {children}
      </ul>
      {showFade ? (
        <div
          aria-hidden
          className="pointer-events-none absolute start-0 end-2.5 bottom-0 h-14 bg-gradient-to-t from-card via-card/80 to-transparent"
        />
      ) : null}
    </div>
  );
}
