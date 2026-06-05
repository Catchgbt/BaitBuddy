import React, { useState } from 'react';
import SettingsSection from '@/components/settings/SettingsSection';
import TutorialButton from '@/components/tutorial/TutorialButton';
import TutorialModal from '@/components/tutorial/TutorialModal';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';

export default function Settings() {
  useFeatureTracking('einstellungen');
  const [tutorialOpen, setTutorialOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 w-full px-4 sm:px-6 lg:px-8 py-6 pb-32 space-y-6">
      <TutorialButton onClick={() => setTutorialOpen(true)} />

      <div className="max-w-4xl mx-auto w-full">
        <SettingsSection />
      </div>

      <TutorialModal isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </div>
  );
}