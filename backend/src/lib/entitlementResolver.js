/**
 * One authoritative decision for a tool request. A user may own a feature
 * permanently (level/purchase) without receiving unlimited paid cloud usage.
 */
export function resolveToolAccess({
  premiumActive,
  permanentUnlock,
  unlockType = null,
  monthlyLimit = null,
  monthlyUsed = 0,
}) {
  const source = premiumActive ? 'premium' : permanentUnlock ? unlockType || 'level' : null;
  const entitled = source !== null;
  const quotaAvailable = monthlyLimit === null || monthlyUsed < monthlyLimit;

  return {
    allowed: entitled && quotaAvailable,
    entitled,
    source,
    quota: {
      limited: monthlyLimit !== null,
      limit: monthlyLimit,
      used: monthlyUsed,
      remaining: monthlyLimit === null ? null : Math.max(0, monthlyLimit - monthlyUsed),
    },
  };
}
