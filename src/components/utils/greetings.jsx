/**
 * Gibt eine tageszeitabhängige Begrüßung zurück
 * @param {Object} user - User-Objekt mit nickname, full_name, email
 * @returns {string} - Persönliche Begrüßung
 */
export function getPersonalizedGreeting(user) {
  const hour = new Date().getHours();
  
  // Bestimme die Tageszeit
  let timeGreeting = "";
  if (hour >= 5 && hour < 12) {
    timeGreeting = "Guten Morgen";
  } else if (hour >= 12 && hour < 18) {
    timeGreeting = "Guten Tag";
  } else if (hour >= 18 && hour < 22) {
    timeGreeting = "Guten Abend";
  } else {
    timeGreeting = "Hallo";
  }
  
  // Bestimme den Namen des Users
  let userName = "Angler";
  if (user) {
    if (user.nickname) {
      userName = user.nickname;
    } else if (user.full_name) {
      userName = user.full_name.split(' ')[0];
    } else if (user.email) {
      userName = user.email.split('@')[0];
    }
  }
  
  return `${timeGreeting}, ${userName}`;
}

/**
 * Gibt eine erweiterte Begrüßung mit Motivation zurück
 * @param {Object} user - User-Objekt
 * @returns {string} - Erweiterte Begrüßung
 */
export function getMotivationalGreeting(user) {
  const hour = new Date().getHours();
  const baseGreeting = getPersonalizedGreeting(user);
  
  const motivations = {
    morning: [
      "Der frühe Vogel fängt den Wurm - und du den Fisch! 🎣",
      "Ein perfekter Morgen für einen erfolgreichen Fang!",
      "Die besten Bisse kommen am Morgen!"
    ],
    day: [
      "Bereit für dein nächstes Angel-Abenteuer? 🎣",
      "Die Fische warten schon auf dich!",
      "Zeit, neue Spots zu erkunden!"
    ],
    evening: [
      "Die Dämmerung ist oft die beste Zeit zum Angeln! 🌅",
      "Perfekte Zeit für einen Abend am Wasser!",
      "Die Raubfische werden jetzt aktiv!"
    ],
    night: [
      "Auch nachts sind die Fische aktiv! 🌙",
      "Plane deinen nächsten Trip!",
      "Noch wach? Perfekt für Nachtangeln!"
    ]
  };
  
  let motivationArray = motivations.day;
  if (hour >= 5 && hour < 12) {
    motivationArray = motivations.morning;
  } else if (hour >= 18 && hour < 22) {
    motivationArray = motivations.evening;
  } else if (hour >= 22 || hour < 5) {
    motivationArray = motivations.night;
  }
  
  const randomMotivation = motivationArray[Math.floor(Math.random() * motivationArray.length)];
  
  return `${baseGreeting}! ${randomMotivation}`;
}

/**
 * Gibt eine dynamische Dashboard-Begrüßung basierend auf User-Aktivität zurück
 * @param {Object} user - User-Objekt
 * @param {Object} activity - Aktivitätsobjekt mit hasActiveTrips, hasCatches, hasSpots, hasUsedAIChat
 * @returns {string} - Dynamische Begrüßung
 */
export function getDynamicDashboardGreeting(user, activity = {}) {
  const hour = new Date().getHours();
  
  // Bestimme den Namen des Users
  let userName = "Angler";
  if (user) {
    if (user.nickname) {
      userName = user.nickname;
    } else if (user.full_name) {
      userName = user.full_name.split(' ')[0];
    } else if (user.email) {
      userName = user.email.split('@')[0];
    }
  }
  
  // Spezielle Begrüßungen für neue Nutzer
  if (!activity.hasCatches && !activity.hasSpots) {
    return `Willkommen, ${userName}! 🎣\nBereit für dein erstes Angel-Abenteuer?`;
  }
  
  // Begrüßungen basierend auf aktiven Trips
  if (activity.hasActiveTrips) {
    const greetings = [
      `Willkommen zurück, ${userName}!\nDeine aktiven Trips warten auf dich!`,
      `Hey ${userName}! 🎯\nBereit, deine Trips fortzusetzen?`,
      `Hallo ${userName}!\nZeit für dein nächstes Angel-Abenteuer!`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // Tageszeitabhängige Begrüßungen
  if (hour >= 5 && hour < 12) {
    return `Guten Morgen, ${userName}! ☀️\nPerfekte Zeit für einen Fang!`;
  } else if (hour >= 12 && hour < 18) {
    return `Willkommen zurück, ${userName}!\nBereit für dein nächstes Angel-Abenteuer?`;
  } else if (hour >= 18 && hour < 22) {
    return `Guten Abend, ${userName}! 🌅\nDie Raubfische werden jetzt aktiv!`;
  } else {
    return `Hey ${userName}! 🌙\nAuch nachts ist Angeln spannend!`;
  }
}