import React from 'react';
import { useNavigate } from 'react-router-dom';
import { stackManager } from '@/components/navigation/MobileStackManager';

export default function PageNotFound() {
  const navigate = useNavigate();

  const handleGoHome = () => {
    stackManager.switchTab('home');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl font-bold">404</div>
        <h1 className="text-2xl font-bold">Seite nicht gefunden</h1>
        <p className="text-gray-400">Die angeforderte Seite existiert nicht.</p>
        <button
          onClick={handleGoHome}
          className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors"
        >
          Zur Startseite
        </button>
      </div>
    </div>
  );
}