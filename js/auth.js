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
        
        console.log('✅ Login successful:', data.user.email);
        showToast('Login successful! Redirecting...', 'success');
        
        // The auth state listener will handle the redirect
        
    } catch (error) {
        console.error('❌ Login error:', error);
        showToast('Login failed. Please try again.', 'error');
        hideLoading();
    }
};

window.register = async function() {
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
        
        // 2. Create user profile (CRITICAL MISSING PART!)
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
                    .from('user_profiles')
                    .insert([profileData])
                    .select()
                    .single();
                
                if (profileError) {
                    console.error('❌ Profile insert error:', profileError);
                    console.error('Details:', {
                        message: profileError.message,
                        details: profileError.details,
                        hint: profileError.hint,
                        code: profileError.code
                    });
                    
                    // Don't fail registration - auth user is created
                    console.warn('⚠️ Auth user created but profile insert failed');
                    console.warn('User can still login, profile might need manual creation');
                } else {
                    console.log('✅ Profile created successfully:', profileResult);
                }
            } catch (profileError) {
                console.error('❌ Error in profile creation:', profileError);
                // Continue anyway - auth user is created
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

console.log('✅ auth.js loaded with COMPLETE registration including profile insert');
