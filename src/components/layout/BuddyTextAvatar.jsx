import React from 'react';

// Animierter Text-Avatar "HilfeBuddy"
export const BUDDY_TEXT_CSS = `
  .buddy-text {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #ffffff;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  /* Sanfte Atmungs-Animation */
  .buddy-text-breathing {
    animation: buddyBreathing 2.5s ease-in-out infinite;
  }

  @keyframes buddyBreathing {
    0%, 100% { transform: scale(1) translateY(0); opacity: 1; }
    50% { transform: scale(1.05) translateY(-1px); opacity: 0.95; }
  }

  /* Aktive Sprechanimation - schnelleres Pulsing */
  .buddy-text-speaking {
    animation: buddySpeaking 0.5s ease-in-out infinite;
  }

  @keyframes buddySpeaking {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }

  /* Zuhör-Animation */
  .buddy-text-listening {
    animation: buddyListening 0.6s ease-in-out infinite;
  }

  @keyframes buddyListening {
    0%, 100% { transform: rotate(0deg) scale(1); }
    50% { transform: rotate(1deg) scale(1.03); }
  }

  @media (prefers-reduced-motion: reduce) {
    .buddy-text-breathing,
    .buddy-text-speaking,
    .buddy-text-listening {
      animation: none;
    }
  }
`;

export default function BuddyTextAvatar({
  isTalking = false,
  isListening = false,
}) {
  const animationClass = isTalking
    ? 'buddy-text-speaking'
    : isListening
    ? 'buddy-text-listening'
    : 'buddy-text-breathing';

  return (
    <div className={`buddy-text ${animationClass}`}>
      <img
        src="/avatars/default-avatar.png"
        alt="HilfeBuddy Avatar"
        className="w-full h-full object-cover rounded-full"
      />
    </div>
  );
}
