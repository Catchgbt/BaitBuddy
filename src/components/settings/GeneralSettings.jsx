import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, Settings2 } from 'lucide-react';
import { MobileSelect } from '@/components/ui/mobile-select';
import { useOptimisticMutation } from '@/lib/useOptimisticMutation';

export default function GeneralSettings() {
    const [settings, setSettings] = useState({ language: 'de', theme: 'dark', units: 'metric' });
    const [initialSettings, setInitialSettings] = useState({});

    useEffect(() => {
        (async () => {
            try {
                const user = await base44.auth.me();
                if (user && user.settings) {
                    const currentSettings = {
                        language: user.settings.language || 'de',
                        theme: user.settings.theme || 'dark',
                        units: user.settings.units || 'metric'
                    };
                    setSettings(currentSettings);
                    setInitialSettings(currentSettings);
                }
            } catch (error) {
                toast.error("Fehler beim Laden der Einstellungen.");
            }
        })();
    }, []);

    const settingsMutation = useOptimisticMutation({
        mutationFn: async (newSettings) => {
            await base44.auth.updateMe({ settings: newSettings });
            return newSettings;
        },
        optimisticUpdate: () => settings,
        onSuccess: () => {
            setInitialSettings(settings);
            toast.success("Allgemeine Einstellungen gespeichert!");
        },
        onError: () => {
            toast.error("Fehler beim Speichern der Einstellungen.");
        },
        invalidateOnSettle: false
    });

    const handleSave = () => {
        settingsMutation.mutate(settings);
    };
    
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

    return (
        <div className="border-t border-gray-800 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-gray-400" />
                Allgemein
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm text-gray-400 block mb-2">Sprache</label>
                    <MobileSelect
                        value={settings.language}
                        onValueChange={(value) => setSettings(prev => ({ ...prev, language: value }))}
                        label="Sprache"
                        placeholder="Sprache wählen"
                        options={[
                            { value: 'de', label: 'Deutsch' },
                            { value: 'en', label: 'Englisch' },
                        ]}
                        className="bg-gray-800/50 border-gray-700 text-white"
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-400 block mb-2">Einheiten</label>
                    <MobileSelect
                        value={settings.units}
                        onValueChange={(value) => setSettings(prev => ({ ...prev, units: value }))}
                        label="Einheiten"
                        placeholder="Einheiten wählen"
                        options={[
                            { value: 'metric', label: 'Metrisch (cm, kg)' },
                            { value: 'imperial', label: 'Imperial (in, lbs)' },
                        ]}
                        className="bg-gray-800/50 border-gray-700 text-white"
                    />
                </div>
            </div>
             <div className="mt-4 flex justify-end">
                <Button onClick={handleSave} disabled={settingsMutation.isPending || !hasChanges}>
                    <Save className="w-4 h-4 mr-2" />
                    {settingsMutation.isPending ? 'Speichert...' : 'Änderungen speichern'}
                </Button>
            </div>
        </div>
    );
}