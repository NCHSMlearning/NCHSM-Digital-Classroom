// Supabase Configuration for EduMeet
// Using your provided credentials

const SUPABASE_URL = 'https://gtzftsxgqlbawdkjuaeg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emZ0c3hncWxiYXdka2p1YWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjExMzQsImV4cCI6MjA4NDQzNzEzNH0.7bV8IGLTHWIkObDDHK8ZUEr1idgWoWvE6aMK2Zw0oU4';

// Initialize Supabase client
let supabase;

try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce'
        },
        global: {
            headers: {
                'X-Client-Info': 'edumeet-online-classroom'
            }
        }
    });
    
    console.log('Supabase client initialized successfully');
    
    // Test connection
    supabase.auth.getSession().then(({ data }) => {
        console.log('Connection test successful');
    }).catch(error => {
        console.error('Connection test failed:', error);
    });
    
} catch (error) {
    console.error('Failed to initialize Supabase:', error);
    showError('Unable to connect to the server. Please try again later.');
}

// Export for global use
window.supabase = supabase;

// Error display function
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-banner';
    errorDiv.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        </div>
    `;
    
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        text-align: center;
        z-index: 9999;
        font-weight: 500;
    `;
    
    document.body.prepend(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 10000);
}

// Check if Supabase is properly configured
function isSupabaseConfigured() {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY && supabase);
}

// Export utility functions
window.supabaseConfig = {
    isConfigured: isSupabaseConfigured,
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY
};
