import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * AccessibleIconButton - Button with built-in ARIA support
 *
 * Enforces best practices:
 * - aria-label required for icon-only buttons
 * - Minimum 44px tap target
 * - Focus ring visible
 * - Works with screen readers
 *
 * Usage:
 *   <AccessibleIconButton
 *     icon={X}
 *     label="Schließen"
 *     onClick={handleClose}
 *   />
 */
export function AccessibleIconButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  variant = 'ghost',
  size = 'icon',
  className = '',
  ariaLabel = label,
  ariaPressed = undefined,
  ariaHasPopup = false,
  ariaExpanded = undefined,
  role = undefined,
  ...props
}) {
  if (!label && !ariaLabel) {
    console.warn('AccessibleIconButton: icon-only button requires aria-label or label prop');
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'min-h-[44px] min-w-[44px]', // WCAG minimum tap target
        className
      )}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-haspopup={ariaHasPopup ? 'true' : undefined}
      aria-expanded={ariaExpanded}
      role={role}
      {...props}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
    </Button>
  );
}

/**
 * AccessibleButtonGroup - Group of icon buttons
 *
 * Usage:
 *   <AccessibleButtonGroup aria-label="Text formatting">
 *     <AccessibleIconButton icon={Bold} label="Bold" />
 *     <AccessibleIconButton icon={Italic} label="Italic" />
 *   </AccessibleButtonGroup>
 */
export function AccessibleButtonGroup({
  children,
  ariaLabel,
  className = ''
}) {
  return (
    <div
      className={cn('flex gap-2 items-center', className)}
      role="group"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

export default AccessibleIconButton;