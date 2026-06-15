import { getPremiumWalletStatus } from "@/functions/getPremiumWalletStatus";

/**
 * Prüft ob der Benutzer Premium-Credits verfügbar hat
 */
export async function isPremiumActive(user) {
  if (!user) return false;
  
  try {
    const response = await getPremiumWalletStatus();
    return response?.data?.status === 'active' && response?.data?.wallet?.remaining_credits > 0;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
}

/**
 * Entscheidet, ob Werbung angezeigt werden soll.
 */
export function canShowAds(user) {
  if (!user) {
    return false;
  }
  
  // Prüfen, ob das Erstöffnungsdatum gesetzt ist
  if (user.first_open_at) {
    const firstOpenDate = new Date(user.first_open_at);
    const threeDaysInMillis = 259200000; 
    const showAdsDate = new Date(firstOpenDate.getTime() + threeDaysInMillis);
    
    return new Date() > showAdsDate;
  }

  return false;
}

/**
 * Formatiert Credits in menschenlesbares Format
 */
export function formatCredits(credits) {
  if (!credits || credits <= 0) return "0 Credits";
  
  if (credits >= 1000000) {
    return `${(credits / 1000000).toFixed(1)}M Credits`;
  } else if (credits >= 1000) {
    return `${(credits / 1000).toFixed(1)}K Credits`;
  }
  
  return `${credits.toLocaleString()} Credits`;
}

/**
 * Berechnet den Preis für eine bestimmte Credit-Menge
 */
export function calculateCreditPrice(credits) {
  if (credits < 500 || credits > 10000) return 0;
  return Math.round((2.21 + (credits * 0.002778)) * 100) / 100;
}

/**
 * Berechnet den Rabatt gegenüber dem Basis-Preis
 */
export function calculateDiscount(credits) {
  const basePrice = 4.99; // Preis für 1000 Credits
  const actualPricePerThousand = calculateCreditPrice(credits) / credits * 1000;
  
  if (actualPricePerThousand >= basePrice) return 0;
  
  return Math.round(((basePrice - actualPricePerThousand) / basePrice) * 100);
}