import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Credit-Pakete mit linearer Preisformel: Preis = 2.21 + (Credits × 0.002778)
const generateCreditPackages = () => {
  const packages = [];
  
  // Von 500 bis 10000 Credits in 500er-Schritten
  for (let credits = 500; credits <= 10000; credits += 500) {
    const price = Math.round((2.21 + (credits * 0.002778)) * 100) / 100;
    const pricePerThousand = Math.round((price / credits * 1000) * 100) / 100;
    const discount = credits >= 5000 ? Math.round(((4.99 - pricePerThousand) / 4.99) * 100) : 0;
    
    packages.push({
      id: `credits-${credits}`,
      label: `${credits.toLocaleString()} Credits`,
      credits: credits,
      price_eur: price,
      price_per_thousand: pricePerThousand,
      discount_percent: Math.max(0, discount),
      is_popular: credits === 5000, // 5000 Credits als beliebtestes Paket markieren
      is_best_value: credits === 10000 // 10000 Credits als besten Wert markieren
    });
  }
  
  return packages;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return Response.json({ 
      ok: true,
      products: generateCreditPackages(),
      pricing_info: {
        base_price: 4.99,
        base_credits: 1000,
        max_discount_percent: 40,
        formula: "Lineare Preisformel mit Mengenrabatt"
      }
    });
    
  } catch (error) {
    console.error('Get Premium Products Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});