// js/auth.js - Authentication module
console.log('🔐 Loading authentication module...');

let authSubscription = null;

export async function initAuth() {
    try {
        const supabase = getSupabase();
        
        // Setup auth state listener
        authSubscription = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('🔐 Auth event:', event);
                await handleAuthState(event, session);
            }
        );
        
        console.log('✅ Auth module initialized');
        
    } catch (error) {
        console.error('❌ Failed to initialize auth:', error);
        throw error;
    }
}

export async function checkAuth() {
    try {
        const supabase = getSupabase();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
            await handleAuthenticatedUser(session.user);
            return true;
        } else {
            showLoginScreen();
            return false;
        }
        
    } catch (error) {
        console.error('Auth check error:', error);
        showLoginScreen();
        return false;
    }
}

export async function handleAuthState(event, session) {
    switch(event) {
        case 'SIGNED_IN':
            if (session?.user) {
                await handleAuthenticatedUser(session.user);
            }
            break;
            
        case 'SIGNED_OUT':
            handleUserSignedOut();
            break;
            
        case 'USER_UPDATED':
            if (session?.user) {
                AppState.currentUser = session.user;
                updateUserInfo();
            }
            break;
    }
}

async function handleAuthenticatedUser(user) {
    console.log('👤 User authenticated:', user.email);
    
    try {
        // Update AppState
        AppState.currentUser = user;
        AppState.userRole = user.user_metadata?.role || 'student';
        
        // Show main app
        showMainApp();
        
        // Update UI
        updateUserInfo();
        updateNavigation();
        
        // Show dashboard
        showSection('dashboard');
        
        // Load user data in background
        setTimeout(() => loadUserData(), 300);
        
    } catch (error) {
        console.error('Error handling authenticated user:', error);
    }
}

function handleUserSignedOut() {
    console.log('👋 User signed out');
    
    // Reset AppState
    AppState.currentUser = null;
    AppState.userRole = null;
    
    // Show login screen
    showLoginScreen();
}

// Export login/logout functions
export async function login(email, password) {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        return { success: true, user: data.user };
        
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

export async function logout() {
    try {
        const supabase = getSupabase();
        await supabase.auth.signOut();
        return { success: true };
        
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: error.message };
    }
}
