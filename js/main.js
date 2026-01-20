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
        await updateUserState(user);
        
        // Show main application
        showMainApp();
        
        // Update UI based on role
        updateRoleBasedUI();
        
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

async function updateUserState(user) {
    AppState.currentUser = user;
    
    // Try to get role from database profile
    try {
        const { data: profile, error } = await window.supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single();
        
        if (!error && profile) {
            AppState.userRole = profile.role || 'student';
            AppState.currentUser.full_name = profile.full_name || user.email;
        } else {
            // Fallback to user_metadata
            AppState.userRole = user.user_metadata?.role || 'student';
            AppState.currentUser.full_name = user.user_metadata?.full_name || user.email;
        }
    } catch (error) {
        console.warn('⚠️ Error fetching profile:', error);
        AppState.userRole = user.user_metadata?.role || 'student';
        AppState.currentUser.full_name = user.user_metadata?.full_name || user.email;
    }
    
    // Store in localStorage for persistence
    localStorage.setItem('userRole', AppState.userRole);
    
    console.log(`👤 User role set to: ${AppState.userRole}`);
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
    document.body.removeAttribute('data-role');
}

// =====================
// ROLE-BASED UI UPDATES
// =====================

function updateRoleBasedUI() {
    console.log('🎭 Updating UI for role:', AppState.userRole);
    
    if (!AppState.userRole) return;
    
    // Set data-role on body for CSS targeting
    document.body.setAttribute('data-role', AppState.userRole);
    
    // Update welcome message and role
    updateWelcomeMessage();
    
    // Update navigation based on role
    updateNavigationForRole();
    
    // Update quick actions
    updateQuickActions();
    
    // Update dashboard content
    updateDashboardForRole();
}

function updateWelcomeMessage() {
    console.log('👤 Updating welcome message');
    
    if (!AppState.currentUser) return;
    
    const userName = AppState.currentUser.full_name || 
                    AppState.currentUser.email?.split('@')[0] || 
                    'User';
    const role = AppState.userRole?.charAt(0).toUpperCase() + AppState.userRole?.slice(1) || 'User';
    
    // Update user name
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
        el.textContent = `Welcome, ${userName}`;
    });
    
    // Update role badge
    const roleElements = document.querySelectorAll('.user-role');
    roleElements.forEach(el => {
        el.textContent = role;
        
        // Add role-specific styling
        el.className = 'user-role';
        el.classList.add(`${AppState.userRole}-badge`);
    });
}

function updateNavigationForRole() {
    console.log('🧭 Updating navigation for role:', AppState.userRole);
    
    // Hide/show navigation items based on role
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const allowedRoles = item.dataset.roles;
        if (allowedRoles) {
            const roles = allowedRoles.split(',');
            item.style.display = roles.includes(AppState.userRole) ? 'flex' : 'none';
        }
    });
}

function updateQuickActions() {
    console.log('⚡ Updating quick actions for role:', AppState.userRole);
    
    const quickActions = document.getElementById('quick-actions');
    if (!quickActions) return;
    
    if (AppState.userRole === 'teacher') {
        quickActions.innerHTML = `
            <button class="quick-action-btn" onclick="showSection('classroom')">
                <i class="fas fa-video"></i>
                <span>Start Class</span>
            </button>
            <button class="quick-action-btn" onclick="createAssignmentModal()">
                <i class="fas fa-plus"></i>
                <span>New Assignment</span>
            </button>
            <button class="quick-action-btn" onclick="sendAnnouncement()">
                <i class="fas fa-bullhorn"></i>
                <span>Send Announcement</span>
            </button>
            <button class="quick-action-btn" onclick="showSection('grades')">
                <i class="fas fa-chart-bar"></i>
                <span>View Grades</span>
            </button>
        `;
    } else {
        quickActions.innerHTML = `
            <button class="quick-action-btn" onclick="showSection('classroom')">
                <i class="fas fa-video"></i>
                <span>Join Class</span>
            </button>
            <button class="quick-action-btn" onclick="showSection('assignments')">
                <i class="fas fa-tasks"></i>
                <span>View Assignments</span>
            </button>
            <button class="quick-action-btn" onclick="showSection('grades')">
                <i class="fas fa-chart-bar"></i>
                <span>My Grades</span>
            </button>
            <button class="quick-action-btn" onclick="showSection('resources')">
                <i class="fas fa-folder-open"></i>
                <span>Study Materials</span>
            </button>
        `;
    }
}

function updateDashboardForRole() {
    console.log('📊 Updating dashboard for role:', AppState.userRole);
    
    const sectionHeader = document.querySelector('#dashboard-section .section-header');
    if (!sectionHeader) return;
    
    const actionsDiv = sectionHeader.querySelector('.actions');
    if (!actionsDiv) return;
    
    // Update header text
    const headerTitle = sectionHeader.querySelector('h2');
    if (headerTitle) {
        if (AppState.userRole === 'teacher') {
            headerTitle.textContent = 'Teacher Dashboard';
        } else {
            headerTitle.textContent = 'Student Dashboard';
        }
    }
}

function resetUI() {
    console.log('🔄 Resetting UI');
    
    // Clear user info
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.innerHTML = '<span class="user-name">Welcome, Guest</span><span class="user-role">Guest</span>';
    }
    
    // Reset navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        item.style.display = 'flex'; // Reset display
    });
    
    // Reset body attribute
    document.body.removeAttribute('data-role');
    
    // Reset quick actions
    const quickActions = document.getElementById('quick-actions');
    if (quickActions) {
        quickActions.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bolt"></i>
                <p>Please log in to see actions</p>
            </div>
        `;
    }
    
    // Activate dashboard nav item
    const dashboardNav = document.querySelector('.nav-item[data-section="dashboard"]');
    if (dashboardNav) {
        dashboardNav.classList.add('active');
    }
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
            const section = navItem.dataset.section || 
                           navItem.getAttribute('onclick')?.match(/showSection\('(.+?)'\)/)?.[1];
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
        
        // Update role-based UI for this section
        if (sectionId === 'dashboard') {
            updateDashboardForRole();
        }
    }
}

function triggerSectionLoad(sectionId) {
    // Dispatch custom event for modules to listen to
    document.dispatchEvent(new CustomEvent('sectionChanged', {
        detail: { section: sectionId, userRole: AppState.userRole }
    }));
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

// Add createClassModal to window if not defined by classroom.js
if (typeof createClassModal === 'undefined') {
    window.createClassModal = function() {
        console.log('🏫 Placeholder: Opening create class modal');
        showToast('Create class functionality not loaded', 'warning');
    };
}

// Add createAssignmentModal to window
if (typeof createAssignmentModal === 'undefined') {
    window.createAssignmentModal = function() {
        console.log('📝 Placeholder: Opening create assignment modal');
        showToast('Create assignment functionality not loaded', 'warning');
    };
}

// Add sendAnnouncement to window
if (typeof sendAnnouncement === 'undefined') {
    window.sendAnnouncement = function() {
        console.log('📢 Placeholder: Sending announcement');
        showToast('Announcement functionality not loaded', 'warning');
    };
}

// =====================
// INITIALIZATION COMPLETE
// =====================

console.log('✅ Main.js loaded - Application controller ready');
