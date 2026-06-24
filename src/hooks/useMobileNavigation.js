import { useNavigate } from 'react-router-dom';
import { useMobileStack } from '@/components/navigation/MobileStackManager';

export function useMobileNavigation() {
  const navigate = useNavigate();
  const { stackManager } = useMobileStack();

  const goToPage = (pageName) => {
    stackManager.push(pageName);
    const url = pageName === 'Dashboard' ? '/' : '/' + pageName;
    navigate(url);
  };

  const goBack = () => {
    const prevPage = stackManager.pop();
    if (prevPage) {
      const url = prevPage === 'Dashboard' ? '/' : '/' + prevPage;
      navigate(url);
    }
  };

  const switchTab = (tabName) => {
    const targetPage = stackManager.switchTab(tabName);
    if (targetPage) {
      const url = targetPage === 'Dashboard' ? '/' : '/' + targetPage;
      navigate(url);
    }
  };

  return { goToPage, goBack, switchTab, stackManager };
}