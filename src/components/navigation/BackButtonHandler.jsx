import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMobileStack } from './MobileStackManager';

export default function BackButtonHandler() {
  const navigate = useNavigate();
  const { stackManager } = useMobileStack();

  useEffect(() => {
    const handleBackButton = (e) => {
      if (stackManager.handleAndroidBack()) {
        e.preventDefault();
        const prevPage = stackManager.getCurrentPage();
        if (prevPage) {
          navigate('/' + (prevPage === 'Dashboard' ? '' : prevPage));
        }
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        handleBackButton(e);
      }
    };

    window.addEventListener('popstate', handleBackButton);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, stackManager]);

  return null;
}