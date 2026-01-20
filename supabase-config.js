// Supabase Configuration - FIXED VERSION
const SUPABASE_URL = 'https://gtzftsxgqlbawdkjuaeg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emZ0c3hncWxiYXdka2p1YWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjExMzQsImV4cCI6MjA4NDQzNzEzNH0.7bV8IGLTHWIkObDDHK8ZUEr1idgWoWvE6aMK2Zw0oU4';

// Initialize Supabase ONLY if not already initialized
if (!window.supabase) {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
    console.log('Supabase initialized');
} else {
    console.log('Supabase already initialized');
}
