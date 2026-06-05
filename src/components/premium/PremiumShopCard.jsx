import React from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Coins, CalendarDays } from 'lucide-react';

export default function PremiumShopCard({ product, onPurchase, disabled }) {
  return (
    <div className="p-6 rounded-2xl bg-gray-800/60 border border-gray-700 flex flex-col justify-between items-center text-center space-y-4 hover:bg-gray-800 transition-colors">
      <div className="space-y-2">
        <h4 className="text-lg font-bold text-white flex items-center justify-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          {product.name}
        </h4>
        <div className="flex items-center justify-center gap-2 text-gray-300">
          <CalendarDays className="w-4 h-4" />
          <span>{product.durationDays} Tage</span>
        </div>
      </div>
      <div className="space-y-4">
        <div className="text-2xl font-semibold text-amber-400 flex items-center justify-center gap-2">
          <Coins className="w-6 h-6" />
          <span>{product.price.toLocaleString('de-DE')}</span>
        </div>
        <Button
          onClick={onPurchase}
          disabled={disabled}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Kaufen
        </Button>
      </div>
    </div>
  );
}