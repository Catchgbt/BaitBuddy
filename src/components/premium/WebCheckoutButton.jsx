import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// Web-Checkout via Stripe: Karte, PayPal, SEPA Lastschrift, Klarna
export default function WebCheckoutButton({ planId, disabled }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('createStripeCheckoutSession', {
        plan_id: planId
      });

      const checkoutUrl = response?.data?.checkout_url;
      if (!checkoutUrl) {
        throw new Error(response?.data?.error || 'Checkout-Session konnte nicht erstellt werden.');
      }

      window.location.href = checkoutUrl;
    } catch (error) {
      toast.error('Checkout fehlgeschlagen', {
        description: error?.message || 'Unbekannter Fehler'
      });
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || loading}
      variant="outline"
      className="w-full border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Weiterleitung...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4" />
          Karte / Google Pay / Apple Pay
        </>
      )}
    </Button>
  );
}