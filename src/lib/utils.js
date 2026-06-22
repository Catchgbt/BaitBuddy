import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

// Formatiert ein Datum fuer ein <input type="datetime-local"> ("YYYY-MM-DDTHH:mm").
// datetime-local-Inputs erwarten lokale Wandzeit; new Date(...).toISOString()
// liefert dagegen UTC und verschiebt die angezeigte Zeit um den Zeitzonen-Offset.
// Beim wiederholten Bearbeiten wuerde die gespeicherte Zeit dadurch sogar
// kumulativ driften. Daher hier explizit in lokale Zeit umrechnen.
export function toLocalDatetimeInputValue(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}
