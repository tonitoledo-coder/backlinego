import React, { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pullY = useMotionValue(0);
  const rotate = useTransform(pullY, [0, THRESHOLD], [0, 360]);
  const opacity = useTransform(pullY, [0, THRESHOLD * 0.4], [0, 1]);
  const scale  = useTransform(pullY, [0, THRESHOLD], [0.6, 1]);

  const handleTouchStart = useCallback((e) => {
    // Only engage if already at top of scroll container
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      // Resist with rubber-band easing
      pullY.set(Math.min(THRESHOLD * 1.4, delta * 0.45));
    }
  }, [refreshing, pullY]);

  const handleTouchEnd = useCallback(async () => {
    if (startY.current === null) return;
    startY.current = null;

    if (pullY.get() >= THRESHOLD * 0.85) {
      setRefreshing(true);
      pullY.set(THRESHOLD * 0.6);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        pullY.set(0);
      }
    } else {
      pullY.set(0);
    }
  }, [pullY, onRefresh]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative', overflowAnchor: 'none' }}
    >
      {/* Pull indicator */}
      <motion.div
        style={{
          height: pullY,
          opacity,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <motion.div style={{ scale, rotate }}>
          <RefreshCw
            className="w-5 h-5"
            style={{ color: refreshing ? '#1DDF7A' : '#71717a' }}
          />
        </motion.div>
      </motion.div>

      {children}
    </div>
  );
}