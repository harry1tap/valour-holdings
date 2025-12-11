
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ldbbdxaotopiktwjddyb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkYmJkeGFvdG9waWt0d2pkZHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Nzg3NzYsImV4cCI6MjA4MDE1NDc3Nn0.pYt5Wr0ncffrCmTwMDZGoCoSeYt82clG_dewUlzOS5Y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ECO4 Client
const ECO4_URL = 'https://bmqqhruxyajunctvjmgn.supabase.co';
const ECO4_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcXFocnV4eWFqdW5jdHZqbWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNjg2NzYsImV4cCI6MjA3OTY0NDY3Nn0.b63CazoVU8V4Q0xsRVCZab3Rxs0pD8Zac3zGKsm1NlM';

export const supabaseECO4 = createClient(ECO4_URL, ECO4_ANON_KEY);
