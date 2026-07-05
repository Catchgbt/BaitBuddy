// Angler-Witze und KI-Buddy Sprüche für die Sprechblase

export const BUDDY_JOKES = [
  // Angler-Witze
  'Warum gehen Fische nie ins Fitnessstudio? Weil sie schon Muskeln haben!',
  'Was sagten die zwei Fische? Nichts, sie haben sich einfach angeschwiegen!',
  'Wie heißt ein nervöser Fisch? Zitter-Fisch!',
  'Warum sind Angler so gute Lügner? Weil sie immer die größten Erfolgsgeschichten erzählen!',
  'Ein Angler geht in einen Fischladen. Der Verkäufer fragt: "Willst du sie fangen oder verkaufen?" "Ich dachte, sie sind schon gefangen?"',
  'Was ist der Unterschied zwischen einem Angler und einer Lügnerin? Der Lügner hat eine Grenze!',
  'Ein Angler ohne Fische ist wie ein Kaffee ohne Koffein – einfach sinnlos!',
  'Warum sind Fische in Schulen? Weil sie unterrichtet werden wollen!',
  'Ein Angler, ein Jäger und ein Golfer fangen im Himmel an. Welcher kommt zuerst raus? Der Angler – er hat weniger zu lügen!',

  // Persönliche Zwischenfragen
  'Wie war dein letzter Angelausflug? Erzähl mir von deinen Fängen!',
  'Was ist dein Lieblingsfisch zum Angeln?',
  'Hast du einen neuen Spot entdeckt?',
  'Welcher Köder funktioniert bei dir am besten?',
  'Wann gehst du das nächste Mal angeln?',
  'Brauchst du Tipps für bessere Fänge?',
  'Welche Angelmethode magst du lieber – Fliegenfischen oder Grundfischen?',

  // Lebendige Zwischenfragen
  'Was hat dich denn zuletzt ganz besonders begeistert beim Angeln?',
  'Hast du schon mal einen Traum-Fang landen können?',
  'Wie siehts aus – gehts du eher aufs Volumen oder auf Big Game?',
  'Was ist dein absolutes Lieblings-Gewässer?',
  'Hast du aktuell einen bestimmten Fisch im Visier?',
  'Welche Jahreszeit ist für dich die beste Angelsaison?',
  'Fischst du eher morgens, abends oder nachts am liebsten?',
  'Gibt es einen Spot, an dem du immer erfolgreich warst?',
  'Was war dein größter Fang bis jetzt?',
  'Hast du mal was Unerwartetes beim Angeln erlebt?',
  'Angelst du lieber allein oder mit Freunden?',
  'Was ist deine größte Angel-Herausforderung im Moment?',

  // Motivierende Sprüche
  'Der beste Fang wartet auf dich – gib nicht auf!',
  'Jede schnelle Linie ist ein Versprechen auf Abenteuer!',
  'Angeln ist nicht nur ein Hobby – es ist eine Lebenseinstellung!',
  'Die besten Erinnerungen entstehen am Wasser!',
  'Mit jedem Wurf kommt Glück näher!',
  'Angeln lehrt uns: Geduld ist eine Tugend!',
  'Der nächste Monster-Fang könnte heute kommen – halts Auge offen!',
  'Jeder erfahrene Angler war mal ein Anfänger – du machst das super!',
];

/**
 * Gib einen zufälligen Witz/Spruch
 */
export function getRandomBuddyJoke() {
  const randomIndex = Math.floor(Math.random() * BUDDY_JOKES.length);
  return BUDDY_JOKES[randomIndex];
}

/**
 * Finale Nachricht, die vor dem Auto-Close angezeigt wird
 */
export const BUDDY_FAREWELL_MESSAGES = [
  'Bis später – viel Spaß beim Angeln!',
  'Schreib mir, wenn du wieder da bist!',
  'Ich warte hier auf dich!',
  'Viel Erfolg beim nächsten Angelausflug!',
  'Bis bald, mein Angelbuddy!',
];

export function getRandomFarewellMessage() {
  const randomIndex = Math.floor(Math.random() * BUDDY_FAREWELL_MESSAGES.length);
  return BUDDY_FAREWELL_MESSAGES[randomIndex];
}
