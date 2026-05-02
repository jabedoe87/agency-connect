import { PRICE_IDS, getStripeMode } from "../_shared/stripe-mode.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const mode = getStripeMode();
  return new Response(
    JSON.stringify({ mode, priceIds: PRICE_IDS[mode] }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
