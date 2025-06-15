import { useState, useRef } from 'react';

interface TouchPosition {
  x: number;
  y: number;
}

export const useSwipeGestures = (
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  minSwipeDistance: number = 80
) => {
  const [touchStart, setTouchStart] = useState<TouchPosition | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    
    const deltaX = currentX - touchStart.x;
    const deltaY = currentY - touchStart.y;

    // Only allow horizontal dragging if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault(); // Prevent scrolling
      
      // Limit drag distance to prevent excessive stretching
      const maxDrag = 120;
      const limitedDragOffset = Math.max(-maxDrag, Math.min(maxDrag, deltaX));
      
      setDragOffset(limitedDragOffset);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart) return;

    const shouldTriggerAction = Math.abs(dragOffset) > minSwipeDistance;

    if (shouldTriggerAction) {
      if (dragOffset > 0) {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }
    }

    // Reset state with animation
    setDragOffset(0);
    setIsDragging(false);
    setTouchStart(null);
  };

  // Mouse events for testing on desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setTouchStart({
      x: e.clientX,
      y: e.clientY
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!touchStart || !isDragging) return;

    const deltaX = e.clientX - touchStart.x;
    const deltaY = e.clientY - touchStart.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const maxDrag = 120;
      const limitedDragOffset = Math.max(-maxDrag, Math.min(maxDrag, deltaX));
      setDragOffset(limitedDragOffset);
    }
  };

  const handleMouseUp = () => {
    if (!touchStart) return;

    const shouldTriggerAction = Math.abs(dragOffset) > minSwipeDistance;

    if (shouldTriggerAction) {
      if (dragOffset > 0) {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }
    }

    setDragOffset(0);
    setIsDragging(false);
    setTouchStart(null);
  };

  // Calculate background visibility and type
  const getBackgroundStyle = () => {
    const opacity = Math.min(Math.abs(dragOffset) / minSwipeDistance, 1);
    const isIncrease = dragOffset > 0;
    
    return {
      opacity,
      backgroundColor: isIncrease ? '#10b981' : '#ef4444', // green or red
      transform: `translateX(${dragOffset}px)`
    };
  };

  const getRowStyle = () => ({
    transform: `translateX(${dragOffset}px)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
    zIndex: isDragging ? 10 : 1,
  });

  const getActionIcon = () => {
    if (Math.abs(dragOffset) < 20) return null;
    return dragOffset > 0 ? '+1' : '-1';
  };

  const showBackground = Math.abs(dragOffset) > 10;

  return {
    // Touch events
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    
    // Mouse events (for desktop testing)
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    
    // State and styles
    dragOffset,
    isDragging,
    getRowStyle,
    getBackgroundStyle,
    getActionIcon,
    showBackground,
    elementRef
  };
};