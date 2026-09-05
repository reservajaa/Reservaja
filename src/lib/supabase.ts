import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://vzbdbpfbfematfviyztl.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YmRicGZiZmVtYXRmdml5enRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NjEwMDAsImV4cCI6MjA5ODMzNzAwMH0.OLElfQuRqpAnH_xZFFYkATBIeTYYwjX6OvHOBagiqpc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
