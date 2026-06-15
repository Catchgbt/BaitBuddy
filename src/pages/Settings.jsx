import React, { useState } from 'react';
import SettingsPageTabbed from '@/components/settings/SettingsPageTabbed';
import TutorialButton from '@/components/tutorial/TutorialButton';
import TutorialModal from '@/components/tutorial/TutorialModal';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';

export default function Settings() {
  useFeatureTracking('einstellungen');
  const [tutorialOpen, setTutorialOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 w-full">
      <TutorialButton onClick={() => setTutorialOpen(true)} />
      <SettingsPageTabbed />
      <TutorialModal isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </div>
  );
}