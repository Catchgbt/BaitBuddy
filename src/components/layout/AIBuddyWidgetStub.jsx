import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BUDDY_AVATAR_SIZE } from '@/lib/buddyStorageKeys';

const AVATAR_SIZE = BUDDY_AVATAR_SIZE;

function clampPos(x, y) {
  if (typeof window === 'undefined') return { x, y };
  return {
    x: Math.max(0, Math.min(x, window.innerWidth - AVATAR_SIZE)),
    y: Math.max(0, Math.min(y, window.innerHeight - AVATAR_SIZE)),
  };
}

function getDefaultPos() {
  if (typeof window === 'undefined') return { x: 300, y: 500 };
  return {
    x: window.innerWidth - AVATAR_SIZE - 24,
    y: window.innerHeight - AVATAR_SIZE - 100,
  };
}

// Import the full widget – will be lazy loaded only on first interaction
import AIBuddyWidget from '@/components/layout/AIBuddyWidget';

export default function AIBuddyWidgetStub() {
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  // Avatar click triggers lazy load and open
  const handleAvatarClick = () => {
    setWidgetLoaded(true);
  };

  return (
    <>
      {!widgetLoaded ? (
        <SimpleAvatar onClickAvatar={handleAvatarClick} />
      ) : (
        <AIBuddyWidget />
      )}
    </>
  );
}

function SimpleAvatar({ onClickAvatar }) {
  const [pos, setPos] = useState(() => {
    try {
      const stored = localStorage.getItem('buddy-widget-pos');
      return stored ? JSON.parse(stored) : getDefaultPos();
    } catch {
      return getDefaultPos();
    }
  });

  const [isHidden, setIsHidden] = useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      setPos((prev) => clampPos(prev?.x || 0, prev?.y || 0));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const dragStateRef = React.useRef({
    active: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    moved: false,
  });

  const handleMouseDown = React.useCallback(
    (e) => {
      e.preventDefault();
      if (dragStateRef.current.active) return;

      const currentPos = pos || getDefaultPos();
      dragStateRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - currentPos.x,
        offsetY: e.clientY - currentPos.y,
        moved: false,
      };

      const onMove = (ev) => {
        const ds = dragStateRef.current;
        if (!ds.active) return;

        const dx = Math.abs(ev.clientX - ds.startX);
        const dy = Math.abs(ev.clientY - ds.startY);
        if (dx > 5 || dy > 5) {
          ds.moved = true;
        }

        if (ds.moved) {
          const newPos = clampPos(ev.clientX - ds.offsetX, ev.clientY - ds.offsetY);
          setPos(newPos);
          try {
            localStorage.setItem('buddy-widget-pos', JSON.stringify(newPos));
          } catch {}
        }
      };

      const onUp = () => {
        const wasDrag = dragStateRef.current.moved;
        dragStateRef.current.active = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (!wasDrag) {
          onClickAvatar();
        }
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [pos, onClickAvatar]
  );

  const handleTouchStart = React.useCallback(
    (e) => {
      if (dragStateRef.current.active) return;
      const touch = e.touches[0];
      const currentPos = pos || getDefaultPos();
      dragStateRef.current = {
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
        offsetX: touch.clientX - currentPos.x,
        offsetY: touch.clientY - currentPos.y,
        moved: false,
      };
    },
    [pos]
  );

  const handleTouchMove = React.useCallback((e) => {
    const touch = e.touches[0];
    const ds = dragStateRef.current;
    if (!ds.active) return;

    const dx = Math.abs(touch.clientX - ds.startX);
    const dy = Math.abs(touch.clientY - ds.startY);
    if (dx > 5 || dy > 5) {
      ds.moved = true;
    }

    if (ds.moved) {
      const newPos = clampPos(touch.clientX - ds.offsetX, touch.clientY - ds.offsetY);
      setPos(newPos);
      try {
        localStorage.setItem('buddy-widget-pos', JSON.stringify(newPos));
      } catch {}
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = React.useCallback(() => {
    const wasDrag = dragStateRef.current.moved;
    dragStateRef.current = { active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, moved: false };
    if (!wasDrag) {
      onClickAvatar();
    }
  }, [onClickAvatar]);

  const currentPos = pos || getDefaultPos();

  if (isHidden) {
    return null;
  }

  return (
    <div
      className="fixed z-50"
      style={{
        left: currentPos.x,
        top: currentPos.y,
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
      }}
    >
      <motion.div
        className="relative cursor-grab active:cursor-grabbing select-none touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        whileHover={{ scale: 1.08 }}
        animate={{
          y: [0, -4, 0],
        }}
        transition={{
          y: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
      >
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-transparent drop-shadow-lg">
          <img
            src="/assets/buddy/marina-avatar.png"
            alt="Sabrina – dein Angel-Buddy"
            className="w-full h-full object-cover object-top"
            draggable={false}
          />
        </div>
      </motion.div>
    </div>
  );
}
