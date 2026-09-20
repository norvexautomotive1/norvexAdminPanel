import { createClient } from "@supabase/supabase-js";

// Dacă folosești Vite: variabilele trebuie să înceapă cu VITE_
// și le pui în .env (nu .env.local commitat) la rădăcina proiectului:
//   VITE_SUPABASE_URL=https://xxxxx.supabase.co
//   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
//
// IMPORTANT: aici pui doar SUPABASE_PUBLISHABLE_KEY (fosta "anon key").
// SUPABASE_SECRET_KEY NU trebuie NICIODATĂ pusă în frontend — ocolește
// complet RLS-ul și e doar pentru server/Edge Functions.
//
// Dacă folosești Create React App, înlocuiește import.meta.env.VITE_...
// cu process.env.REACT_APP_... (și prefixul din .env cu REACT_APP_)

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
