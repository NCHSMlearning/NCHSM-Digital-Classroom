// auth.js - Authentication Module
console.log('🔐 auth.js loading...');

// =====================
// GLOBAL AUTH FUNCTIONS
// =====================

window.login = async function() {
    console.log('🔑 Login function called');
    
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    
    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    try {
        showLoading();
        console.log('Attempting login for:', email);
        
        if (!window.supabase?.auth) {
            throw new Error('Authentication service not available');
        }
        
        // 1. Login with Supabase Auth
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Login error:', error);
            showToast('Invalid email or password', 'error');
            hideLoading();
            return;
        }
        
        console.log('✅ Auth login successful:', data.user.email);
        showToast('Login successful!', 'success');
        
        // 2. Check if user exists in consolidated_user_profiles_table
        const { data: profile, error: profileError } = await window.supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('email', email)
            .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
            // Error other than "no rows returned"
            console.error('❌ Profile check error:', profileError);
        }
        
        let profileId;
        
        if (profileError || !profile) {
            console.warn('⚠️ User not found in consolidated_user_profiles_table:', email);
            console.warn('Creating profile from auth data...');
            
            // Create profile from auth data
            const profileData = {
                id: data.user.id,
                email: data.user.email,
                full_name: data.user.user_metadata?.full_name || email.split('@')[0],
                role: data.user.user_metadata?.role || 'student',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            console.log('📤 Creating profile:', profileData);
            
            const { data: newProfile, error: createError } = await window.supabase
                .from('consolidated_user_profiles_table')
                .insert([profileData])
                .select()
                .single();
            
            if (createError) {
                console.error('❌ Failed to create profile:', createError);
                // Continue anyway - use auth user ID
                profileId = data.user.id;
            } else {
                console.log('✅ Profile created:', newProfile);
                profileId = newProfile.id;
            }
        } else {
            console.log('✅ Profile found:', profile);
            profileId = profile.id;
        }
        
        // 3. Update AppState with user info
        if (window.AppState) {
            window.AppState.currentUser = {
                id: profileId || data.user.id,
                email: data.user.email,
                full_name: data.user.user_metadata?.full_name || email.split('@')[0],
                role: data.user.user_metadata?.role || 'student'
            };
            window.AppState.userRole = window.AppState.currentUser.role;
            console.log('📊 AppState updated:', window.AppState.currentUser);
        }
        
        // 4. Hide loading and show main app
        hideLoading();
        
        // The auth state listener will handle the redirect
        // But trigger it manually after a short delay
        setTimeout(() => {
            if (window.supabase?.auth?.getSession) {
                window.supabase.auth.getSession();
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Login error:', error);
        showToast('Login failed. Please try again.', 'error');
        hideLoading();
    }
};

// Remove registration if not needed, or keep it for reference
window.register = async function() {
    showToast('Registration is currently disabled. Please use existing credentials.', 'info');
    return;
    
    /* Keep this commented out as reference
    console.log('📝 ======= REGISTRATION STARTED =======');
    
    const name = document.getElementById('register-name')?.value.trim();
    const email = document.getElementById('register-email')?.value.trim();
    const password = document.getElementById('register-password')?.value;
    const role = document.getElementById('register-role')?.value;
    
    console.log('📋 Form data:', { name, email, role });
    
    if (!name || !email || !password || !role) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    try {
        showLoading();
        
        if (!window.supabase?.auth) {
            throw new Error('Registration service not available');
        }
        
        console.log('🔐 Step 1: Creating auth user...');
        
        // 1. Create auth user
        const { data: authData, error: authError } = await window.supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    role: role
                },
                emailRedirectTo: window.location.origin
            }
        });
        
        if (authError) {
            console.error('❌ Auth error:', authError);
            let message = authError.message;
            if (authError.message.includes('already registered')) {
                message = 'Email already registered. Try logging in.';
            }
            showToast(message, 'error');
            hideLoading();
            return;
        }
        
        console.log('✅ Auth created:', {
            userId: authData.user?.id,
            email: authData.user?.email
        });
        
        // 2. Create user profile
        if (authData.user) {
            console.log('👤 Step 2: Creating user profile...');
            
            try {
                const profileData = {
                    id: authData.user.id,
                    email: email,
                    full_name: name,
                    role: role,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                console.log('📤 Inserting profile:', profileData);
                
                const { data: profileResult, error: profileError } = await window.supabase
                    .from('consolidated_user_profiles_table')
                    .insert([profileData])
                    .select()
                    .single();
                
                if (profileError) {
                    console.error('❌ Profile insert error:', profileError);
                } else {
                    console.log('✅ Profile created successfully:', profileResult);
                }
            } catch (profileError) {
                console.error('❌ Error in profile creation:', profileError);
            }
        } else {
            console.error('❌ No user object in auth response');
        }
        
        console.log('✅ Registration process complete');
        showToast('Registration successful! Please check your email.', 'success');
        
        // Switch to login tab
        showAuthTab('login');
        
        // Clear form
        document.getElementById('register-name').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        
        hideLoading();
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        showToast('Registration failed. Please try again.', 'error');
        hideLoading();
    }
    */
};

window.logout = async function() {
    console.log('🚪 Logout function called');
    
    try {
        if (!window.supabase?.auth) {
            throw new Error('Logout service not available');
        }
        
        const { error } = await window.supabase.auth.signOut();
        
        if (error) throw error;
        
        showToast('Logged out successfully', 'success');
        
        // Clear AppState
        if (window.AppState) {
            window.AppState.currentUser = null;
            window.AppState.userRole = null;
        }
        
        // Return to login screen
        showLoginScreen();
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        showToast('Logout failed', 'error');
    }
};

window.forgotPassword = async function() {
    const email = prompt('Enter your email to reset password:');
    if (!email) return;
    
    try {
        if (!window.supabase?.auth) {
            throw new Error('Password reset not available');
        }
        
        const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        
        if (error) throw error;
        
        showToast('Password reset email sent! Check your inbox.', 'success');
        
    } catch (error) {
        console.error('❌ Password reset error:', error);
        showToast('Failed to send reset email', 'error');
    }
};

window.showAuthTab = function(tab) {
    console.log('📱 Switching to tab:', tab);
    
    // Hide all forms
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    
    // Remove active from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected form
    const form = document.getElementById(`${tab}-form`);
    if (form) form.classList.add('active');
    
    // Activate selected tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.textContent.toLowerCase().includes(tab)) {
            btn.classList.add('active');
        }
    });
};

// =====================
// HELPER FUNCTIONS
// =====================

function showLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

function showLoginScreen() {
    console.log('🔐 Showing login screen');
    
    const loadingScreen = document.getElementById('loading-screen');
    const authScreens = document.getElementById('auth-screens');
    const mainApp = document.getElementById('main-app');
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (authScreens) authScreens.classList.remove('hidden');
    if (mainApp) mainApp.classList.add('hidden');
    
    // Clear login form
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

function showMainApp() {
    console.log('🚀 Showing main app');
    
    const loadingScreen = document.getElementById('loading-screen');
    const authScreens = document.getElementById('auth-screens');
    const mainApp = document.getElementById('main-app');
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (authScreens) authScreens.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
}

// Toast function
if (typeof showToast === 'undefined') {
    window.showToast = function(message, type = 'info') {
        console.log(`📣 ${type}: ${message}`);
        
        if (typeof Toastify !== 'undefined') {
            const colors = {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            };
            
            Toastify({
                text: message,
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: colors[type] || colors.info,
                stopOnFocus: true,
            }).showToast();
        }
    };
}

// Initialize auth state listener
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Initializing auth state listener...');
    
    if (window.supabase?.auth) {
        // Listen for auth state changes
        window.supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Auth state changed:', event, session?.user?.email);
            
            if (event === 'SIGNED_IN' && session) {
                console.log('✅ User signed in:', session.user.email);
                showMainApp();
                
                // Load user data
                if (window.loadUserData) {
                    window.loadUserData();
                }
                
                // Load initial data
                if (window.loadCourses) {
                    window.loadCourses();
                }
                if (window.loadAssignmentsSection) {
                    window.loadAssignmentsSection();
                }
            } else if (event === 'SIGNED_OUT') {
                console.log('🚪 User signed out');
                showLoginScreen();
            } else if (event === 'INITIAL_SESSION') {
                if (session) {
                    console.log('📊 Initial session found:', session.user.email);
                    showMainApp();
                } else {
                    console.log('📊 No initial session');
                    showLoginScreen();
                }
            }
        });
    }
});

console.log('✅ auth.js loaded for consolidated_user_profiles_table');
