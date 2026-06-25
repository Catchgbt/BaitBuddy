export async function executeWithRetry(fn, maxAttempts = 2, delayMs = 1000, onRetry = null) {
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts - 1) {
        if (onRetry) {
          onRetry(attempt + 1, error);
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}
