
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ldbbdxaotopiktwjddyb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkYmJkeGFvdG9waWt0d2pkZHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Nzg3NzYsImV4cCI6MjA4MDE1NDc3Nn0.pYt5Wr0ncffrCmTwMDZGoCoSeYt82clG_dewUlzOS5Y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
