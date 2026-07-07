import React from 'react';

// Liegt im public-Ordner (public/assets/buddy/jule.png) und wird als statische
// URL ausgeliefert; BASE_URL respektiert einen evtl. gesetzten Vite-Base-Pfad.
const juleImage = `${import.meta.env.BASE_URL}assets/buddy/jule.png`;

// Jule – KI-Avatar der Angelexpertin. Zeigt das reale, fotorealistische
// Referenzbild (Android-Look mit blauem Haar und Leucht-Schaltkreisen) als
// runden Avatar. Der Zustand wird über einen pulsierenden Leucht-Ring
// dargestellt:
//  - idle:      ruhiger, sanfter Grund-Schein
//  - listening: türkiser Ring pulsiert (hört zu)
//  - speaking:  goldener Ring pulsiert (spricht)
export const JULE_AVATAR_CSS = `
  .jule-photo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 32%;
    border-radius: 50%;
    display: block;
  }
  .jule-photo {
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(80, 180, 230, 0.28);
    animation: julePhotoIdle 5s ease-in-out infinite;
  }
  .jule-photo--listening {
    box-shadow: 0 0 0 3px rgba(63, 224, 208, 0.55), 0 0 20px rgba(63, 224, 208, 0.7);
    animation: julePhotoListen 1.4s ease-in-out infinite;
  }
  .jule-photo--speaking {
    box-shadow: 0 0 0 3px rgba(255, 208, 110, 0.55), 0 0 20px rgba(255, 208, 110, 0.7);
    animation: julePhotoSpeak 1.1s ease-in-out infinite;
  }

  @keyframes julePhotoIdle {
    0%, 100% { box-shadow: 0 0 12px rgba(80, 180, 230, 0.22); }
    50%      { box-shadow: 0 0 16px rgba(80, 180, 230, 0.4); }
  }
  @keyframes julePhotoListen {
    0%, 100% { box-shadow: 0 0 0 2px rgba(63, 224, 208, 0.45), 0 0 14px rgba(63, 224, 208, 0.55); }
    50%      { box-shadow: 0 0 0 4px rgba(63, 224, 208, 0.65), 0 0 26px rgba(63, 224, 208, 0.85); }
  }
  @keyframes julePhotoSpeak {
    0%, 100% { box-shadow: 0 0 0 2px rgba(255, 208, 110, 0.45), 0 0 14px rgba(255, 208, 110, 0.55); }
    50%      { box-shadow: 0 0 0 4px rgba(255, 208, 110, 0.7), 0 0 26px rgba(255, 208, 110, 0.9); }
  }

  @media (prefers-reduced-motion: reduce) {
    .jule-photo,
    .jule-photo--listening,
    .jule-photo--speaking {
      animation: none;
    }
  }
`;

export default function JuleAvatar({
  speaking = false,
  listening = false,
  size = 96,
  // eslint-disable-next-line no-unused-vars
  showHints = true,
  className = '',
  style = {},
}) {
  const stateClass = speaking
    ? 'jule-photo--speaking'
    : listening
      ? 'jule-photo--listening'
      : '';

  return (
    <div
      className={`jule-photo ${stateClass} ${className}`.trim()}
      style={{ width: size, height: size, ...style }}
    >
      <style>{JULE_AVATAR_CSS}</style>
      <img
        src={juleImage}
        alt="Jule"
        className="jule-photo-img"
        draggable={false}
      />
    </div>
  );
}
