import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMobileStack } from './MobileStackManager';

export default function TabNavigation({ tabs = [] }) {
  const navigate = useNavigate();
  const { stackManager, state } = useMobileStack();

  const handleTabSwitch = (tabName) => {
    const targetPage = stackManager.switchTab(tabName);
    if (targetPage) {
      const pageUrl = targetPage === 'Dashboard' ? '/' : '/' + targetPage;
      navigate(pageUrl);
    }
  };

  if (tabs.length === 0) return null;

  return (
    <div className="flex gap-4 border-b border-slate-700">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => handleTabSwitch(tab.id)}
          className={`px-4 py-2 font-medium transition-colors ${
            state.currentTab === tab.id
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
          aria-current={state.currentTab === tab.id ? 'page' : undefined}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}