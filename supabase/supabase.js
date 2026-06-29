"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = exports.supabase = void 0;
exports.getSupabaseClient = getSupabaseClient;
var supabase_js_1 = require("@supabase/supabase-js");
// Client-side Supabase client (uses anon key)
exports.supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
// Server-side Supabase client (uses service role key for admin operations)
exports.supabaseAdmin = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
// Helper function to get the appropriate client based on context
function getSupabaseClient(useServiceRole) {
    if (useServiceRole === void 0) { useServiceRole = false; }
    return useServiceRole ? exports.supabaseAdmin : exports.supabase;
}
