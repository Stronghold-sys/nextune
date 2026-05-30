const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yocenipoqhcyzgvbayfb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvY2VuaXBvcWhjeXpndmJheWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNDU0MzEsImV4cCI6MjA3NzgyMTQzMX0.CkWBDv2K7I6DRq5DN497gok8pbv0MEMHF5H_e8Q1jwM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, username, role, premium_until');
  
  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Profiles in Database:');
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
