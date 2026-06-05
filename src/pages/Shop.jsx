import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import PageContainer from '@/components/layout/PageContainer';
import { usePredictivePrefetch } from '@/hooks/usePredictivePrefetch';

export default function ShopPage() {
  usePredictivePrefetch('Shop');

  return (
    <PageContainer maxWidth="max-w-6xl" enableSwipeRefresh={false}>
      <div className="space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
            CatchGbt Shop
          </h1>
          <p className="text-gray-400">
            Demnächst verfügbar: Ausrüstung, Merchandise und mehr!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <Card className="glass-morphism border-gray-800 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
                Angelausrüstung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-6xl mb-4">P</div>
                <h3 className="text-lg font-semibold text-white mb-2">Bald verfügbar!</h3>
                <p className="text-gray-400 text-sm">
                  Hochwertige Angelausrüstung direkt über die App bestellen.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border-gray-800 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
                CatchGbt Merchandise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-6xl mb-4">M</div>
                <h3 className="text-lg font-semibold text-white mb-2">Bald verfügbar!</h3>
                <p className="text-gray-400 text-sm">
                  T-Shirts, Caps und mehr mit dem CatchGbt Logo.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border-gray-800 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
                Geschenkgutscheine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-6xl mb-4">G</div>
                <h3 className="text-lg font-semibold text-white mb-2">Bald verfügbar!</h3>
                <p className="text-gray-400 text-sm">
                  Premium-Zeit und Features als Geschenk für Freunde.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-morphism border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-cyan-400 mb-2 drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]">
              Premium-Funktionen verfuegbar
            </h3>
            <p className="text-gray-300 mb-4">
              Während wir am Shop arbeiten, kannst du bereits jetzt Premium-Zeit kaufen und alle KI-Features nutzen.
            </p>
            <a href="/Premium" className="inline-block px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
              Zu Premium wechseln
            </a>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}