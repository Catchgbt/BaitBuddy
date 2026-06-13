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

  /* Sanfte Atmungs-Animation (echtes Heben/Senken, keine Rotation) */
  .buddy-text-breathing {
    animation: buddyBreathing 3s ease-in-out infinite;
  }

  @keyframes buddyBreathing {
    0%, 100% { transform: scale(1) translateY(0); }
    50% { transform: scale(1.04) translateY(-2px); }
  }

  /* Aktive Sprechanimation - lebendiges Nicken/Wippen */
  .buddy-text-speaking {
    animation: buddySpeaking 0.6s ease-in-out infinite;
  }

  @keyframes buddySpeaking {
    0%, 100% { transform: scale(1) translateY(0); }
    35% { transform: scale(1.05) translateY(-3px); }
    70% { transform: scale(1.02) translateY(1px); }
  }

  /* Zuhör-Animation - aufmerksames Vorlehnen (keine Rotation) */
  .buddy-text-listening {
    animation: buddyListening 1.4s ease-in-out infinite;
  }

  @keyframes buddyListening {
    0%, 100% { transform: scale(1) translateY(0); }
    50% { transform: scale(1.03) translateY(-2px); }
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
