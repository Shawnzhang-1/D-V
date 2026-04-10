import { useState, useCallback, useRef, useMemo } from 'react';

interface VirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualScroll({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 3,
}: VirtualScrollOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const { virtualItems, totalHeight } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({ index: i, start: i * itemHeight });
    }

    return {
      virtualItems: items,
      totalHeight: itemCount * itemHeight,
    };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = index * itemHeight;
    }
  }, [itemHeight]);

  return {
    virtualItems,
    totalHeight,
    containerProps: {
    style: {
      height: `${containerHeight}px`,
      overflow: 'auto',
      position: 'relative',
    },
    onScroll: handleScroll,
    ref: containerRef,
  },
    scrollToIndex,
  };
}
