import React, { useState, lazy, Suspense } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BUDDY_AVATAR_SIZE, BUDDY_TIMEOUTS } from '@/lib/buddyStorageKeys';
import JuleAvatar from '@/components/ai/JuleAvatar';

const AVATAR_SIZE = BUDDY_AVATAR_SIZE;

// Das vollständige Widget (framer-motion-Chat, TTS, ai-Client, Offline-Wissen)
// wird erst bei der ersten Interaktion als eigener Chunk nachgeladen. So bleibt
// der initiale Layout-Chunk klein (App-Start-Budget < 3 Sek.).
const AIBuddyWidget = lazy(() => import('@/components/layout/AIBuddyWidget'));

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

export default function AIBuddyWidgetStub() {
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  // Avatar click triggers lazy load and open
  const handleAvatarClick = () => {
    setWidgetLoaded(true);
  };

  if (!widgetLoaded) {
    return <SimpleAvatar onClickAvatar={handleAvatarClick} />;
  }

  // Solange der Widget-Chunk lädt, bleibt der Avatar sichtbar (kein Flackern).
  return (
    <Suspense fallback={<SimpleAvatar onClickAvatar={handleAvatarClick} />}>
      <AIBuddyWidget />
    </Suspense>
  );
}

function SimpleAvatar({ onClickAvatar }) {
  const prefersReducedMotion = useReducedMotion();
  const [pos, setPos] = useState(() => {
    try {
      const stored = localStorage.getItem('buddy-widget-pos');
      return stored ? JSON.parse(stored) : getDefaultPos();
    } catch {
      return getDefaultPos();
    }
  });

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

  // Siehe AIBuddyWidget: verhindert, dass die vom Browser nach einem Tap
  // synthetisierten Geister-Mausevents den Klick ein zweites Mal auslösen.
  const lastTouchRef = React.useRef(0);

  const handleMouseDown = React.useCallback(
    (e) => {
      if (Date.now() - lastTouchRef.current < 700) return;
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
        if (dx > BUDDY_TIMEOUTS.DRAG_THRESHOLD || dy > BUDDY_TIMEOUTS.DRAG_THRESHOLD) {
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
      lastTouchRef.current = Date.now();
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
    if (dx > BUDDY_TIMEOUTS.DRAG_THRESHOLD || dy > BUDDY_TIMEOUTS.DRAG_THRESHOLD) {
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
    lastTouchRef.current = Date.now();
    const wasDrag = dragStateRef.current.moved;
    dragStateRef.current = { active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, moved: false };
    if (!wasDrag) {
      onClickAvatar();
    }
  }, [onClickAvatar]);

  const currentPos = pos || getDefaultPos();

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
        whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
        animate={prefersReducedMotion ? { y: 0 } : { y: [0, -4, 0] }}
        transition={prefersReducedMotion ? { duration: 0 } : {
          y: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
      >
        <div className="relative w-14 h-14 drop-shadow-lg">
          <JuleAvatar size={56} />
        </div>
      </motion.div>
    </div>
  );
}
