// js/main.js - Main Application Controller
console.log('🚀 EduMeet - Main Application Controller');

// =====================
// APPLICATION STATE
// =====================
window.AppState = {
    currentUser: null,
    userRole: null,
    currentSection: 'dashboard',
    isInClass: false,
    notifications: [],
    teacherClasses: [],
    enrolledClasses: [],
    pendingSubmissions: [],
    pendingAssignments: []
};

// =====================
// MAIN INITIALIZATION
// =====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📱 DOM Loaded - Initializing EduMeet');
    
    try {
        // 1. Hide loading screen
        hideLoadingScreen();
        
        // 2. Initialize UI first
        if (typeof initUI === 'function') {
            initUI();
        }
        
        // 3. Check authentication
        await checkAuth();
        
        // 4. Initialize modules after auth
        initializeModules();
        
        console.log('✅ EduMeet initialized successfully');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showToast('Application failed to initialize', 'error');
    }
});

// =====================
// AUTHENTICATION CONTROL
// =====================

let authSubscription = null;
let isProcessingAuth = false;

async function checkAuth() {
    console.log('🔐 Checking authentication status');
    
    try {
        // Wait for Supabase to be ready
        if (!window.supabase?.auth) {
            console.log('⏳ Waiting for Supabase...');
            setTimeout(checkAuth, 500);
            return;
        }
        
        // Get current session
        const { data: { session }, error } = await window.supabase.auth.getSession();
        
        if (error) {
            console.error('Session error:', error);
            showLoginScreen();
            return;
        }
        
        if (session?.user) {
            console.log('✅ User already logged in:', session.user.email);
            await handleAuthenticatedUser(session.user);
        } else {
            console.log('👤 No active session');
            showLoginScreen();
        }
        
        // Setup auth listener for future changes
        setupAuthListener();
        
    } catch (error) {
        console.error('Auth check error:', error);
        showLoginScreen();
    }
}

function setupAuthListener() {
    if (!window.supabase?.auth || authSubscription) {
        return;
    }
    
    console.log('🔔 Setting up auth state listener');
    
    // Listen for auth state changes
    authSubscription = window.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔐 Auth event:', event);
        
        // Debounce to prevent multiple calls
        if (window.authTimeout) {
            clearTimeout(window.authTimeout);
        }
        
        window.authTimeout = setTimeout(async () => {
            switch(event) {
                case 'SIGNED_IN':
                    console.log('✅ User signed in');
                    if (session?.user) {
                        await handleAuthenticatedUser(session.user);
                    }
                    break;
                    
                case 'SIGNED_OUT':
                    console.log('👋 User signed out');
                    handleUserSignedOut();
                    break;
                    
                case 'USER_UPDATED':
                    console.log('👤 User updated');
                    if (session?.user) {
                        updateUserState(session.user);
                    }
                    break;
                    
                case 'INITIAL_SESSION':
                    console.log('📋 Initial session');
                    if (session?.user) {
                        await handleAuthenticatedUser(session.user);
                    }
                    break;
            }
        }, 100);
    });
}

async function handleAuthenticatedUser(user) {
    // Prevent multiple processing
    if (isProcessingAuth) {
        console.log('⚠️ Auth already processing, skipping...');
        return;
    }
    
    isProcessingAuth = true;
    
    try {
        console.log('👤 Handling authenticated user:', user.email);
        
        // Update application state
        updateUserState(user);
        
        // Show main application
        showMainApp();
        
        // Update UI
        updateUserUI();
        
        // Show dashboard
        showSection('dashboard');
        
        // Load user data in background
        setTimeout(() => {
            loadUserData();
        }, 300);
        
        console.log('✅ User session established');
        
    } catch (error) {
        console.error('❌ Error handling authenticated user:', error);
    } finally {
        // Reset processing flag
        setTimeout(() => {
            isProcessingAuth = false;
        }, 500);
    }
}

function handleUserSignedOut() {
    console.log('👋 Handling user sign out');
    
    // Reset application state
    resetAppState();
    
    // Show login screen
    showLoginScreen();
    
    // Reset UI
    resetUI();
}

// =====================
// STATE MANAGEMENT
// =====================

function updateUserState(user) {
    AppState.currentUser = user;
    AppState.userRole = user.user_metadata?.role || 'student';
    
    // Store in localStorage for persistence
    localStorage.setItem('userRole', AppState.userRole);
    
    console.log(`👤 User role set to: ${AppState.userRole}`);
}

function updateUserUI() {
    // Update user info display
    if (typeof updateUserInfo === 'function') {
        updateUserInfo();
    }
    
    // Update navigation based on role
    if (typeof updateNavigation === 'function') {
        updateNavigation();
    }
    
    // Update welcome message
    updateWelcomeMessage();
}

function resetAppState() {
    AppState.currentUser = null;
    AppState.userRole = null;
    AppState.teacherClasses = [];
    AppState.enrolledClasses = [];
    AppState.pendingSubmissions = [];
    AppState.pendingAssignments = [];
    AppState.notifications = [];
    
    // Clear localStorage
    localStorage.removeItem('userRole');
}

// =====================
// MODULE INITIALIZATION
// =====================

function initializeModules() {
    console.log('🔧 Initializing application modules');
    
    // Initialize dashboard module
    if (typeof initDashboard === 'function') {
        initDashboard();
    }
    
    // Initialize assignments module
    if (typeof initAssignments === 'function') {
        initAssignments();
    }
    
    // Initialize classroom module
    if (typeof initClassroom === 'function') {
        initClassroom();
    }
    
    // Setup global event listeners
    setupGlobalListeners();
}

function setupGlobalListeners() {
    console.log('🔗 Setting up global event listeners');
    
    // Navigation clicks
    document.addEventListener('click', function(e) {
        // Handle nav items
        const navItem = e.target.closest('.nav-item');
        if (navItem) {
            e.preventDefault();
            const section = navItem.dataset.section || navItem.getAttribute('onclick')?.match(/showSection\('(.+?)'\)/)?.[1];
            if (section) {
                showSection(section);
            }
        }
        
        // Handle logout button
        if (e.target.closest('#logout-btn') || (e.target.id === 'logout-btn')) {
            e.preventDefault();
            logoutUser();
        }
    });
    
    // Handle enter key in login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (typeof window.login === 'function') {
                    window.login();
                }
            }
        });
    }
}

// =====================
// NAVIGATION & UI
// =====================

window.showSection = function(sectionId) {
    console.log(`📁 Showing section: ${sectionId} for ${AppState.userRole}`);
    
    // Update navigation state
    updateNavigationState(sectionId);
    
    // Show/hide sections
    showSectionContent(sectionId);
    
    // Update application state
    AppState.currentSection = sectionId;
    
    // Trigger section load event
    triggerSectionLoad(sectionId);
};

function updateNavigationState(sectionId) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        
        const itemSection = item.dataset.section || 
                           item.getAttribute('onclick')?.match(/showSection\('(.+?)'\)/)?.[1];
        
        if (itemSection === sectionId) {
            item.classList.add('active');
        }
    });
}

function showSectionContent(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
    }
}

function triggerSectionLoad(sectionId) {
    // Dispatch custom event for modules to listen to
    document.dispatchEvent(new CustomEvent('sectionChanged', {
        detail: { section: sectionId, userRole: AppState.userRole }
    }));
}

function updateWelcomeMessage() {
    const welcomeElement = document.querySelector('.welcome-message, .user-name');
    if (welcomeElement && AppState.currentUser) {
        const userName = AppState.currentUser.user_metadata?.full_name || 
                        AppState.currentUser.email?.split('@')[0] || 
                        'User';
        const role = AppState.userRole?.charAt(0).toUpperCase() + AppState.userRole?.slice(1);
        welcomeElement.textContent = `Welcome, ${userName}`;
        
        // Update role badge if exists
        const roleBadge = document.querySelector('.user-role, .role-badge');
        if (roleBadge) {
            roleBadge.textContent = role;
            
            // Set color based on role
            const colors = {
                teacher: '#4f46e5',
                student: '#10b981',
                admin: '#ef4444'
            };
            roleBadge.style.color = colors[AppState.userRole] || '#6b7280';
        }
    }
}

// =====================
// SCREEN MANAGEMENT
// =====================

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
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
    
    // Clear forms
    clearLoginForms();
}

function showMainApp() {
    console.log('🚀 Showing main application');
    
    const loadingScreen = document.getElementById('loading-screen');
    const authScreens = document.getElementById('auth-screens');
    const mainApp = document.getElementById('main-app');
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (authScreens) authScreens.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
}

function clearLoginForms() {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

function resetUI() {
    // Clear user info
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.innerHTML = '<span class="user-name">Loading...</span><span class="user-role">Loading...</span>';
    }
    
    // Reset navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Activate dashboard nav item
    const dashboardNav = document.querySelector('.nav-item[data-section="dashboard"]');
    if (dashboardNav) {
        dashboardNav.classList.add('active');
    }
}

// =====================
// DATA LOADING
// =====================

async function loadUserData() {
    if (!AppState.currentUser) return;
    
    console.log('👤 Loading user data for:', AppState.userRole);
    
    try {
        // Load role-specific data
        if (AppState.userRole === 'teacher') {
            await loadTeacherData();
        } else if (AppState.userRole === 'student') {
            await loadStudentData();
        }
        
        // Load common data
        await loadCommonData();
        
        // Update dashboard if active
        if (AppState.currentSection === 'dashboard') {
            triggerSectionLoad('dashboard');
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

async function loadTeacherData() {
    console.log('📚 Loading teacher data');
    
    try {
        // Load teacher classes
        if (typeof loadTeacherClasses === 'function') {
            await loadTeacherClasses();
        }
        
        // Load pending submissions
        if (typeof loadPendingSubmissions === 'function') {
            await loadPendingSubmissions();
        }
        
        // Load teacher notifications
        if (typeof loadTeacherNotifications === 'function') {
            await loadTeacherNotifications();
        }
        
    } catch (error) {
        console.error('Error loading teacher data:', error);
    }
}

async function loadStudentData() {
    console.log('📖 Loading student data');
    
    try {
        // Load enrolled classes
        if (typeof loadEnrolledClasses === 'function') {
            await loadEnrolledClasses();
        }
        
        // Load pending assignments
        if (typeof loadPendingAssignments === 'function') {
            await loadPendingAssignments();
        }
        
        // Load student grades
        if (typeof loadStudentGrades === 'function') {
            await loadStudentGrades();
        }
        
    } catch (error) {
        console.error('Error loading student data:', error);
    }
}

async function loadCommonData() {
    try {
        // Load announcements
        if (typeof loadAnnouncements === 'function') {
            await loadAnnouncements();
        }
        
        // Load notifications
        if (typeof loadNotifications === 'function') {
            await loadNotifications();
        }
        
        // Load calendar events
        if (typeof loadCalendarEvents === 'function') {
            await loadCalendarEvents();
        }
        
    } catch (error) {
        console.error('Error loading common data:', error);
    }
}

// =====================
// UTILITY FUNCTIONS
// =====================

// Toast notification function
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
    } else {
        // Fallback alert
        alert(`${type.toUpperCase()}: ${message}`);
    }
};

window.showError = function(message) {
    showToast(message, 'error');
    console.error('Error:', message);
};

// Logout function
async function logoutUser() {
    try {
        if (!window.supabase?.auth) {
            throw new Error('Authentication service not available');
        }
        
        const { error } = await window.supabase.auth.signOut();
        
        if (error) throw error;
        
        showToast('Logged out successfully', 'success');
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        showToast('Logout failed', 'error');
    }
}

// Global logout function
window.logout = logoutUser;

// =====================
// MODULE PLACEHOLDER FUNCTIONS
// =====================

// These functions will be implemented in their respective modules
// Placeholders to prevent errors if modules haven't been loaded

if (typeof loadTeacherClasses === 'undefined') {
    window.loadTeacherClasses = async function() {
        console.log('📚 Placeholder: Loading teacher classes');
    };
}

if (typeof loadEnrolledClasses === 'undefined') {
    window.loadEnrolledClasses = async function() {
        console.log('📖 Placeholder: Loading enrolled classes');
    };
}

if (typeof updateUserInfo === 'undefined') {
    window.updateUserInfo = function() {
        console.log('👤 Placeholder: Updating user info');
    };
}

if (typeof updateNavigation === 'undefined') {
    window.updateNavigation = function() {
        console.log('🧭 Placeholder: Updating navigation');
    };
}

// =====================
// INITIALIZATION COMPLETE
// =====================

console.log('✅ Main.js loaded - Application controller ready');
