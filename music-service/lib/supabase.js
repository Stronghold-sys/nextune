const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://yocenipoqhcyzgvbayfb.supabase.co';
// Anon key / service role key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvY2VuaXBvcWhjeXpndmJheWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNDU0MzEsImV4cCI6MjA3NzgyMTQzMX0.CkWBDv2K7I6DRq5DN497gok8pbv0MEMHF5H_e8Q1jwM';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = { supabase };
