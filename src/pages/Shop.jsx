import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Store,
  Search,
  MapPin,
  Navigation,
  LocateFixed,
  Loader2,
  Crown,
  ChevronRight,
  Package
} from "lucide-react";
import PageContainer from '@/components/layout/PageContainer';
import { usePredictivePrefetch } from '@/hooks/usePredictivePrefetch';
import angelshops from '@/data/angelshops.json';
import { UsedGearMarketInner } from '@/pages/UsedGear';

const PAGE_SIZE = 24;

// Luftlinie zwischen zwei Koordinaten in Kilometern (Haversine).
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Nur Läden mit gültigen Koordinaten sind für Distanz/Route brauchbar.
const SHOPS = angelshops.filter(
  (s) => s?.coordinates && s.coordinates.lat != null && s.coordinates.lng != null
);

// Angelshop-Finder Section
function AngelshopFinderContent() {
  const [query, setQuery] = useState('');
  const [userPos, setUserPos] = useState(null);
  const [locState, setLocState] = useState('idle');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocState('denied');
      return;
    }
    setLocState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocState('ready');
      },
      () => setLocState('denied'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const shops = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = SHOPS;
    if (q) {
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.city?.toLowerCase().includes(q) ||
          s.street?.toLowerCase().includes(q)
      );
    }
    if (userPos) {
      list = list
        .map((s) => ({
          ...s,
          _dist: haversineKm(userPos.lat, userPos.lng, s.coordinates.lat, s.coordinates.lng),
        }))
        .sort((a, b) => a._dist - b._dist);
    } else {
      list = [...list].sort((a, b) =>
        (a.city || '').localeCompare(b.city || '', 'de') ||
        (a.name || '').localeCompare(b.name || '', 'de')
      );
    }
    return list;
  }, [query, userPos]);

  const shown = shops.slice(0, visible);

  const routeUrl = (shop) =>
    `https://www.google.com/maps/dir/?api=1&destination=${shop.coordinates.lat},${shop.coordinates.lng}`;

  return (
    <div className="space-y-6">
      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setVisible(PAGE_SIZE); }}
                placeholder="Nach Laden, Stadt oder Straße suchen"
                className="pl-9 bg-gray-900/60 border-gray-700 text-white placeholder:text-gray-500"
                aria-label="Angelladen suchen"
              />
            </div>
            <Button
              onClick={requestLocation}
              disabled={locState === 'loading'}
              className="bg-cyan-600 hover:bg-cyan-700 shrink-0"
            >
              {locState === 'loading'
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <LocateFixed className="w-4 h-4 mr-2" />}
              {locState === 'ready' ? 'Standort aktualisieren' : 'Läden in der Nähe'}
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{shops.length} Angelläden gefunden</span>
            {locState === 'denied' && (
              <span className="text-amber-400">
                Standort nicht verfügbar – Sortierung nach Stadt.
              </span>
            )}
            {locState === 'ready' && (
              <span className="text-emerald-400">Nach Entfernung sortiert.</span>
            )}
          </div>
        </CardContent>
      </Card>

      {shown.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((shop) => (
            <Card
              key={shop.id}
              className="glass-morphism border-gray-800 rounded-2xl hover:border-cyan-600/50 transition-colors"
            >
              <CardContent className="p-4 flex flex-col h-full">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-semibold leading-tight truncate">{shop.name}</h3>
                    <div className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {[shop.street, shop.city].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  </div>
                  {shop._dist != null && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs shrink-0">
                      {shop._dist < 10 ? shop._dist.toFixed(1) : Math.round(shop._dist)} km
                    </Badge>
                  )}
                </div>
                <a
                  href={routeUrl(shop)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto"
                >
                  <Button
                    variant="outline"
                    className="w-full border-cyan-700/50 text-cyan-300 hover:bg-cyan-900/30"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Route planen
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          Keine Angelläden für „{query}" gefunden.
        </div>
      )}

      {visible < shops.length && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Weitere Läden laden
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  usePredictivePrefetch('Shop');

  return (
    <PageContainer maxWidth="max-w-6xl" enableSwipeRefresh={false}>
      <div className="space-y-8">

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
            BaitBuddy Shop
          </h1>
          <p className="text-gray-400">
            Angelläden, Gebrauchtmarkt und alles, was du für dein nächstes Abenteuer brauchst.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="shops" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-900/50 border border-gray-800">
            <TabsTrigger value="shops" className="data-[state=active]:bg-cyan-600">
              <Store className="w-4 h-4 mr-2" />
              Angelläden
            </TabsTrigger>
            <TabsTrigger value="used" className="data-[state=active]:bg-cyan-600">
              <Package className="w-4 h-4 mr-2" />
              Gebrauchtmarkt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shops" className="mt-6">
            <AngelshopFinderContent />
          </TabsContent>

          <TabsContent value="used" className="mt-6">
            <UsedGearMarketInner />
          </TabsContent>
        </Tabs>

        {/* Premium CTA */}
        <Card className="glass-morphism border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]">
                BaitBuddy Premium
              </h3>
              <p className="text-gray-300 text-sm">
                Schalte alle KI-Features, Geräteintegration und erweiterte Analysen frei.
              </p>
            </div>
            <a
              href="/Premium"
              className="inline-flex items-center px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors shrink-0"
            >
              Zu Premium
              <ChevronRight className="w-4 h-4 ml-1" />
            </a>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
