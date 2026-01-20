// Supabase Configuration - Production Version
// IMPORTANT: Configure these values in your deployment environment

// Configuration loaded from environment variables
const SUPABASE_URL = window.SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client
let supabase;

try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Missing Supabase configuration');
    }
    
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
    
    // Verify connection on initialization
    supabase.auth.getSession().then(() => {
        console.log('Supabase connected successfully');
    }).catch(error => {
        console.error('Supabase connection error:', error);
        showConfigurationError();
    });
    
} catch (error) {
    console.error('Failed to initialize Supabase:', error);
    showConfigurationError();
}

// Export for global use
window.supabase = supabase;

// Error handling functions
function showConfigurationError() {
    const errorElement = document.getElementById('configuration-error');
    if (errorElement) {
        errorElement.style.display = 'block';
    } else {
        // Create error banner
        const banner = document.createElement('div');
        banner.id = 'configuration-error';
        banner.innerHTML = `
            <div class="config-error">
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <strong>Configuration Required</strong>
                    <p>Please configure Supabase credentials in your deployment settings.</p>
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .config-error {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: white;
                padding: 16px 20px;
                border-radius: 8px;
                margin: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease-out;
            }
            .config-error i {
                font-size: 24px;
            }
            .config-error strong {
                font-size: 16px;
                display: block;
                margin-bottom: 4px;
            }
            .config-error p {
                font-size: 14px;
                opacity: 0.9;
                margin: 0;
            }
            @keyframes slideIn {
                from {
                    transform: translateY(-20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        
        document.head.appendChild(style);
        document.body.prepend(banner);
    }
}

// Check if Supabase is properly configured
function isSupabaseConfigured() {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY && supabase);
}

// Get configuration status for debugging
function getConfigStatus() {
    return {
        hasUrl: !!SUPABASE_URL,
        hasKey: !!SUPABASE_ANON_KEY,
        isClientInitialized: !!supabase,
        urlLength: SUPABASE_URL ? SUPABASE_URL.length : 0,
        keyLength: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.length : 0
    };
}

// Export utility functions
window.supabaseConfig = {
    isConfigured: isSupabaseConfigured,
    getStatus: getConfigStatus
};
