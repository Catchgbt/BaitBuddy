import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useMobileStack } from './MobileStackManager';

export default function MobileLink({ to, children, className = '', onClick, ...props }) {
  const { stackManager } = useMobileStack();

  const extractPageName = (url) => {
    return url.replace(/^\/?/, '').split('?')[0] || 'Dashboard';
  };

  const handleClick = (e) => {
    const pageName = extractPageName(to);
    stackManager.push(pageName);
    onClick?.(e);
  };

  return (
    <RouterLink
      to={to}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </RouterLink>
  );
}