// supabase-config.js - WORKING VERSION
console.log('🚀 INITIALIZING SUPABASE');

const SUPABASE_URL = 'https://gtzftsxgqlbawdkjuaeg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emZ0c3hncWxiYXdka2p1YWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjExMzQsImV4cCI6MjA4NDQzNzEzNH0.7bV8IGLTHWIkObDDHK8ZUEr1idgWoWvE6aMK2Zw0oU4';

// CRITICAL: Initialize IMMEDIATELY
try {
    // Check if supabase library is loaded
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase library not loaded!');
        // Create a mock to prevent infinite loops
        window.supabase = {
            auth: {
                signUp: () => Promise.reject(new Error('Supabase library failed to load')),
                signInWithPassword: () => Promise.reject(new Error('Supabase library failed to load')),
                signOut: () => Promise.reject(new Error('Supabase library failed to load')),
                getSession: () => Promise.resolve({ data: { session: null }, error: null }),
                getUser: () => Promise.resolve({ data: { user: null }, error: null }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
            }
        };
        console.log('⚠️ Created mock Supabase (library failed)');
    } else {
        // Initialize the real client
        console.log('✅ Supabase library found, creating client...');
        window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client created');
        
        // Quick test
        window.supabase.auth.getSession().then(() => {
            console.log('✅ Supabase auth test successful');
        }).catch(err => {
            console.error('❌ Supabase auth test failed:', err);
        });
    }
} catch (error) {
    console.error('❌ Supabase initialization error:', error);
    // Ensure something exists
    window.supabase = window.supabase || { auth: {} };
}

console.log('🎯 Supabase initialization complete');
console.log('window.supabase exists:', typeof window.supabase !== 'undefined');
console.log('window.supabase.auth exists:', window.supabase && window.supabase.auth ? 'YES' : 'NO');

// Export
window.SUPABASE = window.supabase;
