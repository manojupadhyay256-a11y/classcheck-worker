import { useRef, useCallback } from 'react';
import { useTabNavigation } from './useTabNavigation';

/**
 * Hook that provides native touch-based swipe detection for tab navigation.
 * Uses touchstart/touchend events directly for maximum reliability on mobile.
 */
export const useSwipeNavigation = () => {
    const { swipeLeft, swipeRight } = useTabNavigation();
    const touchStartX = useRef<number>(0);
    const touchStartY = useRef<number>(0);
    const touchStartTime = useRef<number>(0);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        touchStartTime.current = Date.now();
    }, []);

    const onTouchEnd = useCallback((e: React.TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const elapsed = Date.now() - touchStartTime.current;

        const deltaX = touchEndX - touchStartX.current;
        const deltaY = touchEndY - touchStartY.current;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Only trigger if:
        // 1. Horizontal distance > 60px (not an accidental tap)
        // 2. Horizontal movement is at least 1.5x vertical (clearly a horizontal swipe)
        // 3. Swipe completed within 500ms (not a slow drag)
        if (absDeltaX > 60 && absDeltaX > absDeltaY * 1.5 && elapsed < 500) {
            if (deltaX < 0) {
                // Swiped left → go to next tab
                swipeLeft();
            } else {
                // Swiped right → go to previous tab
                swipeRight();
            }
        }
    }, [swipeLeft, swipeRight]);

    return { onTouchStart, onTouchEnd };
};
