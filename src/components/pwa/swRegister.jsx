export const register = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(r => console.log('SW ready:', r.scope))
        .catch(e => console.log('SW:', e));
    });
  }
};