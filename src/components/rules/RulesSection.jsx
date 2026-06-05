import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { FixedSizeList as VirtualList } from "react-window";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MobileSelect } from "@/components/ui/mobile-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Fish, Scale, FileUp, CheckCircle, AlertTriangle, ShieldQuestion, Calendar, WifiOff, RefreshCw } from "lucide-react";
import { FEDERAL_STATES } from "./rule-utils";
import { saveRulesToCache, loadRulesFromCache, getRulesCacheAge } from "@/components/utils/rulesCache";

export default function RulesSection() {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRegion, setFilterRegion] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [cacheInfo, setCacheInfo] = useState(null); // { cachedAt, fromCache }
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // State für den Schnell-Check
  const [checkForm, setCheckForm] = useState({
    region: 'all',
    fish: '',
    length: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async (forceRefresh = false) => {
    setIsLoading(true);

    // Versuche Cache zuerst wenn offline oder kein forceRefresh
    if (!forceRefresh) {
      const cached = loadRulesFromCache();
      if (cached) {
        setRules(cached.rules);
        setCacheInfo({ cachedAt: cached.cachedAt, fromCache: true });
        setIsLoading(false);
        // Im Hintergrund aktualisieren wenn online
        if (navigator.onLine) refreshFromNetwork();
        return;
      }
    }

    await refreshFromNetwork();
  };

  const refreshFromNetwork = async () => {
    try {
      const allRules = await base44.entities.RuleEntry.list("-created_date", 500);
      setRules(allRules);
      saveRulesToCache(allRules);
      setCacheInfo({ cachedAt: Date.now(), fromCache: false });
    } catch (e) {
      console.error("Failed to load rules:", e);
      // Fallback auf Cache auch bei Fehler
      const cached = loadRulesFromCache();
      if (cached) {
        setRules(cached.rules);
        setCacheInfo({ cachedAt: cached.cachedAt, fromCache: true });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    try {
      alert("Import-Funktion ist aktuell deaktiviert");
    } catch (error) {
      console.error("Fehler beim Import:", error);
      alert(`Fehler beim Import: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleQuickCheck = () => {
    const { region, fish, length, date } = checkForm;
    if (!fish) {
      setCheckResult({
        status: 'info',
        title: 'Fischart fehlt',
        message: 'Bitte gib eine Fischart für den Check ein.'
      });
      return;
    }

    const relevantRules = rules.filter(r => 
      (region === 'all' || r.region === region) &&
      r.fish.toLowerCase() === fish.toLowerCase()
    );

    if (relevantRules.length === 0) {
      setCheckResult({
        status: 'info',
        title: 'Keine Regel gefunden',
        message: `Für "${fish}" in der gewählten Region wurden keine spezifischen Regeln gefunden.`
      });
      return;
    }

    const warnings = [];
    const notes = [];

    relevantRules.forEach(rule => {
      // Mindestmaß-Check
      if (length && rule.min_size_cm && Number(length) < rule.min_size_cm) {
        warnings.push(`Mindestmaß von ${rule.min_size_cm} cm in Region "${rule.region}" nicht erreicht.`);
      }
      
      // Schonzeit-Check
      if (date && rule.closed_from && rule.closed_to) {
        const checkDate = new Date(date);
        const fromDate = new Date(rule.closed_from);
        const toDate = new Date(rule.closed_to);
        
        // Jahresübergreifende Schonzeit beachten
        if (fromDate > toDate) { // z.B. 01.10. bis 15.02.
          if (checkDate >= fromDate || checkDate <= toDate) {
            warnings.push(`Fisch hat Schonzeit in Region "${rule.region}" (vom ${fromDate.toLocaleDateString()} bis ${toDate.toLocaleDateString()}).`);
          }
        } else { // Normale Schonzeit
          if (checkDate >= fromDate && checkDate <= toDate) {
            warnings.push(`Fisch hat Schonzeit in Region "${rule.region}" (vom ${fromDate.toLocaleDateString()} bis ${toDate.toLocaleDateString()}).`);
          }
        }
      }
      
      if(rule.notes) notes.push(rule.notes);
    });

    if (warnings.length > 0) {
      setCheckResult({
        status: 'warning',
        title: 'Regelverstoß festgestellt!',
        message: warnings.join('\n')
      });
    } else {
      setCheckResult({
        status: 'success',
        title: 'Alles in Ordnung!',
        message: 'Der Fang entspricht den hinterlegten Regeln.' + (notes.length > 0 ? `\n\nHinweise: ${notes.join(', ')}` : '')
      });
    }
  };

  const filteredRules = useMemo(() => {
    return rules.filter(
      (rule) =>
        (filterRegion === "all" || rule.region === filterRegion) &&
        (searchTerm === "" ||
          rule.fish.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (rule.notes &&
            rule.notes.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [rules, filterRegion, searchTerm]);

  const ResultIcon = ({ status }) => {
    switch(status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'info': return <ShieldQuestion className="h-5 w-5 text-blue-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-white">Regeln & Schonzeiten</CardTitle>
            <div className="flex items-center gap-2">
              {isOffline && (
                <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-900/30 border border-amber-500/30 px-2 py-1 rounded-lg">
                  <WifiOff className="w-3 h-3" /> Offline
                </span>
              )}
              {cacheInfo && (
                <span className="text-xs text-gray-500">
                  {cacheInfo.fromCache ? "Gespeichert" : "Aktuell"} · {getRulesCacheAge(cacheInfo.cachedAt)}
                </span>
              )}
              {!isOffline && (
                <button
                  onClick={() => loadRules(true)}
                  aria-label="Regeln aktualisieren und offline speichern"
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <RefreshCw aria-hidden="true" className="w-3 h-3" /> Aktualisieren
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-4">
              <MobileSelect 
                value={filterRegion} 
                onValueChange={setFilterRegion}
                options={[
                  { value: 'all', label: 'Alle Bundesländer' },
                  ...FEDERAL_STATES.map(stateObj => ({ value: stateObj.name, label: stateObj.name }))
                ]}
                placeholder="Region filtern"
              />
              <Input
                placeholder="Fischart suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs bg-gray-800/50 border-gray-700"
              />
            </div>
            <div className="flex items-center">
              <input type="file" id="rules-upload" className="hidden" onChange={handleFileUpload} accept=".csv,.json" />
              <Button asChild variant="outline" className="border-gray-700">
                <label htmlFor="rules-upload">
                  <FileUp className="w-4 h-4 mr-2" /> Regeln importieren
                </label>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Schnell-Check Card */}
      <Card className="glass-morphism border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ShieldQuestion className="text-blue-400" /> Schnell-Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
           <div className="space-y-1">
             <label className="text-xs text-gray-400">Region</label>
             <MobileSelect 
               value={checkForm.region} 
               onValueChange={v => setCheckForm({...checkForm, region: v})}
               options={[
                 { value: 'all', label: 'Alle Bundesländer' },
                 ...FEDERAL_STATES.map(stateObj => ({ value: stateObj.name, label: stateObj.name }))
               ]}
               placeholder="Region wählen"
             />
           </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Fischart</label>
              <Input 
                value={checkForm.fish} 
                onChange={e => setCheckForm({...checkForm, fish: e.target.value})} 
                placeholder="z.B. Hecht" 
                className="bg-gray-800/50 border-gray-700"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Länge (cm)</label>
              <Input 
                type="number" 
                value={checkForm.length} 
                onChange={e => setCheckForm({...checkForm, length: e.target.value})} 
                placeholder="z.B. 55" 
                className="bg-gray-800/50 border-gray-700"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Datum</label>
              <Input 
                type="date" 
                value={checkForm.date} 
                onChange={e => setCheckForm({...checkForm, date: e.target.value})} 
                className="bg-gray-800/50 border-gray-700"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleQuickCheck} className="bg-blue-600 hover:bg-blue-700">Prüfen</Button>
          </div>
          
          {checkResult && (
            <Alert 
              variant={checkResult.status === 'success' ? 'default' : 'destructive'} 
              className={checkResult.status === 'success' ? 'bg-green-900/30 border-green-500/50' : 'bg-amber-900/30 border-amber-500/50'}
            >
              <ResultIcon status={checkResult.status} />
              <AlertTitle className="font-bold">{checkResult.title}</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">{checkResult.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center p-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
          <p className="mt-2 text-gray-400">Lade Regeln...</p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="text-center py-12">
          <Fish className="w-12 h-12 mx-auto text-gray-600" />
          <p className="mt-4 text-gray-400">Keine Regeln fuer diese Auswahl gefunden.</p>
        </div>
      ) : (
        <VirtualList
          height={Math.min(filteredRules.length * 160, 640)}
          itemCount={filteredRules.length}
          itemSize={160}
          width="100%"
        >
          {({ index, style }) => {
            const rule = filteredRules[index];
            return (
              <div style={{ ...style, paddingBottom: 12 }}>
                <Card className="glass-morphism border-gray-800 h-full overflow-hidden">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-base text-emerald-400">{rule.fish}</CardTitle>
                    <p className="text-xs text-gray-400">{rule.region}</p>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm pt-0">
                    {rule.min_size_cm && (
                      <div className="flex items-center gap-2">
                        <Scale className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-200 text-xs">Mindestmass: <b>{rule.min_size_cm} cm</b></span>
                      </div>
                    )}
                    {(rule.closed_from || rule.closed_to) && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-200 text-xs">
                          Schonzeit: <b>{rule.closed_from ? new Date(rule.closed_from).toLocaleDateString() : "?"} - {rule.closed_to ? new Date(rule.closed_to).toLocaleDateString() : "?"}</b>
                        </span>
                      </div>
                    )}
                    {rule.notes && (
                      <p className="text-xs text-gray-500 pt-1 border-t border-gray-700 truncate">{rule.notes}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          }}
        </VirtualList>
      )}
    </div>
  );
}