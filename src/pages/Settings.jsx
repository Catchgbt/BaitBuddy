import React from 'react';
import SettingsPageTabbed from '@/components/settings/SettingsPageTabbed';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';

export default function Settings() {
  useFeatureTracking('einstellungen');

  return (
    <div className="min-h-screen bg-gray-950 w-full">
      <SettingsPageTabbed />
    </div>
  );
}
