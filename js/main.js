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
            console.log('📝 Auth User ID:', session.user.id);
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
                        await updateUserState(session.user);
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
        console.log('🔑 User ID from auth:', user.id);
        
        // Update application state (ONLY from consolidated table)
        const authorized = await updateUserState(user);
        
        if (!authorized) {
            // User not in consolidated table - already signed out
            return;
        }
        
        // Initialize modules after successful auth
        initializeModules();
        
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
        
        console.log('✅ User session established from consolidated table');
        
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
// STATE MANAGEMENT - UPDATED FIX
// =====================

async function updateUserState(user) {
    AppState.currentUser = user;
    
    console.log('🔍 Looking for user in consolidated_user_profiles_table with user_id:', user.id);
    
    try {
        // FIXED: Query by user_id column instead of email or id
        const { data: profile, error } = await window.supabase
            .from('consolidated_user_profiles_table')
            .select('role, full_name, id, user_id, email')
            .eq('user_id', user.id)  // CRITICAL FIX: Query by user_id column
            .maybeSingle();  // Use maybeSingle to handle no rows gracefully
        
        console.log('🔍 Profile query result:', { profile, error });
        
        if (error) {
            console.error('❌ Database query error:', error);
            
            // If it's a "no rows" error, handle specially
            if (error.code === 'PGRST116' || error.message.includes('0 rows')) {
                console.error('❌ User not found in consolidated_user_profiles_table with user_id:', user.id);
                
                // Sign them out immediately
                await window.supabase.auth.signOut();
                
                showToast('Access denied: User profile not found in system', 'error');
                showLoginScreen();
                return false;
            }
            
            throw error;
        }
        
        if (!profile) {
            // No profile found
            console.error('❌ User not found in consolidated_user_profiles_table with user_id:', user.id);
            
            // Sign them out immediately
            await window.supabase.auth.signOut();
            
            showToast('Access denied: User profile not found in system', 'error');
            showLoginScreen();
            return false;
        }
        
        // User IS in consolidated table - use their data
        AppState.userRole = profile.role;
        AppState.currentUser.full_name = profile.full_name;
        AppState.currentUser.profile_id = profile.id;
        AppState.currentUser.user_id = profile.user_id; // Store the user_id for reference
        AppState.currentUser.profile_email = profile.email; // Store profile email
        
        console.log(`✅ User authorized via consolidated table.`);
        console.log(`   - Role: ${profile.role}`);
        console.log(`   - Name: ${profile.full_name}`);
        console.log(`   - Profile ID: ${profile.id}`);
        console.log(`   - User ID (auth): ${profile.user_id}`);
        console.log(`   - Email: ${profile.email}`);
        
        // Store in localStorage
        localStorage.setItem('userRole', AppState.userRole);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userName', AppState.currentUser.full_name);
        localStorage.setItem('userUUID', profile.user_id);
        localStorage.setItem('profileId', profile.id);
        
        return true; // Success
        
    } catch (error) {
        console.error('❌ Error checking consolidated table:', error);
        
        // Sign them out on error
        try {
            await window.supabase.auth.signOut();
        } catch (signoutError) {
            console.error('Signout error:', signoutError);
        }
        
        showToast('System error: Cannot verify user profile', 'error');
        showLoginScreen();
        return false;
    }
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
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userUUID');
    localStorage.removeItem('profileId');
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
    
    // Update teacher-only elements
    updateTeacherOnlyElements();
    
    // DEBUG: Check if everything is working
    console.log('🔍 DEBUG ROLE CHECK:');
    console.log('- Current role:', AppState.userRole);
    console.log('- Body data-role:', document.body.getAttribute('data-role'));
    console.log('- Teacher buttons found:', document.querySelectorAll('.teacher-only').length);
    console.log('- First teacher button style:', document.querySelector('.teacher-only')?.style.display);
}

function updateWelcomeMessage() {
    console.log('👤 Updating welcome message');
    
    if (!AppState.currentUser) return;
    
    const userName = AppState.currentUser.full_name || 'User';
    
    // Format role for display
    const displayRole = AppState.userRole === 'lecturer' ? 'Lecturer' : 
                       AppState.userRole === 'superadmin' ? 'Super Admin' :
                       AppState.userRole.charAt(0).toUpperCase() + AppState.userRole.slice(1);
    
    // Update user name
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
        el.textContent = `Welcome, ${userName}`;
    });
    
    // Update role badge
    const roleElements = document.querySelectorAll('.user-role');
    roleElements.forEach(el => {
        el.textContent = displayRole;
        
        // Add role-specific styling
        el.className = 'user-role';
        el.classList.add(`${AppState.userRole}-badge`);
    });
}

function updateNavigationForRole() {
    console.log('🧭 Updating navigation for role:', AppState.userRole);
    
    // Define which sections each role can access
    const roleAccess = {
        'superadmin': ['dashboard', 'classroom', 'assignments', 'grades', 'calendar', 'resources', 'discussions'],
        'admin': ['dashboard', 'classroom', 'assignments', 'grades', 'calendar', 'resources', 'discussions'],
        'lecturer': ['dashboard', 'classroom', 'assignments', 'grades', 'calendar', 'resources', 'discussions'],
        'student': ['dashboard', 'classroom', 'assignments', 'grades', 'calendar', 'resources', 'discussions']
    };
    
    const allowedSections = roleAccess[AppState.userRole] || roleAccess.student;
    
    // Hide/show navigation items based on role
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const onclick = item.getAttribute('onclick') || '';
        const sectionMatch = onclick.match(/showSection\('(.+?)'\)/);
        if (sectionMatch) {
            const section = sectionMatch[1];
            const isAllowed = allowedSections.includes(section);
            item.style.display = isAllowed ? 'flex' : 'none';
        }
    });
}

function updateQuickActions() {
    console.log('⚡ Updating quick actions for role:', AppState.userRole);
    
    const quickActions = document.getElementById('quick-actions');
    if (!quickActions) return;
    
    // Define quick actions by role
    const roleActions = {
        'superadmin': `
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
        `,
        
        'admin': `
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
        `,
        
        'lecturer': `
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
        `,
        
        'student': `
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
        `
    };
    
    // Set quick actions based on role
    quickActions.innerHTML = roleActions[AppState.userRole] || roleActions.student;
}

function updateDashboardForRole() {
    console.log('📊 Updating dashboard for role:', AppState.userRole);
    
    const sectionHeader = document.querySelector('#dashboard-section .section-header');
    if (!sectionHeader) return;
    
    // Update header text
    const headerTitle = sectionHeader.querySelector('h2');
    if (headerTitle) {
        const roleTitles = {
            'lecturer': 'Lecturer Dashboard',
            'student': 'Student Dashboard',
            'admin': 'Administrator Dashboard',
            'superadmin': 'Super Admin Dashboard'
        };
        headerTitle.textContent = roleTitles[AppState.userRole] || 'Dashboard';
    }
}

function updateTeacherOnlyElements() {
    console.log('👨‍🏫 Updating teacher-only elements for role:', AppState.userRole);
    
    // Show/hide teacher-only buttons for lecturer/admin/superadmin
    const teacherButtons = document.querySelectorAll('.teacher-only');
    teacherButtons.forEach(btn => {
        const isTeachingRole = AppState.userRole === 'lecturer' || 
                              AppState.userRole === 'admin' || 
                              AppState.userRole === 'superadmin';
        btn.style.display = isTeachingRole ? 'inline-block' : 'none';
        
        // DEBUG: Force show for lecturer if still hidden
        if (AppState.userRole === 'lecturer' && btn.style.display === 'none') {
            console.warn('⚠️ Forcing teacher button to show for lecturer');
            btn.style.display = 'inline-block';
            btn.style.border = '2px solid red'; // Temporary visual indicator
        }
    });
}

function resetUI() {
    console.log('🔄 Resetting UI');
    
    // Clear user info
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.innerHTML = '<span class="user-name">Welcome, Guest</span><span class="user-role">Guest</span>';
    }
    
    // Reset navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
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
    
    // Reset teacher-only elements
    const teacherButtons = document.querySelectorAll('.teacher-only');
    teacherButtons.forEach(btn => {
        btn.style.display = 'none';
        btn.style.border = ''; // Remove debug border
    });
    
    // Activate dashboard nav item
    const dashboardNav = document.querySelector('.nav-item[onclick="showSection(\'dashboard\')"]');
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
            const onclick = navItem.getAttribute('onclick') || '';
            const sectionMatch = onclick.match(/showSection\('(.+?)'\)/);
            if (sectionMatch) {
                showSection(sectionMatch[1]);
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
    
    // Check if user has access to this section
    if (!hasAccessToSection(sectionId)) {
        showToast('You do not have permission to access this section', 'error');
        return;
    }
    
    // Update navigation state
    updateNavigationState(sectionId);
    
    // Show/hide sections
    showSectionContent(sectionId);
    
    // Update application state
    AppState.currentSection = sectionId;
    
    // Trigger section load event
    triggerSectionLoad(sectionId);
};

function hasAccessToSection(sectionId) {
    // Define section access by role
    const sectionAccess = {
        'dashboard': ['student', 'lecturer', 'admin', 'superadmin'],
        'classroom': ['student', 'lecturer', 'admin', 'superadmin'],
        'assignments': ['student', 'lecturer', 'admin', 'superadmin'],
        'grades': ['student', 'lecturer', 'admin', 'superadmin'],
        'calendar': ['student', 'lecturer', 'admin', 'superadmin'],
        'resources': ['student', 'lecturer', 'admin', 'superadmin'],
        'discussions': ['student', 'lecturer', 'admin', 'superadmin']
    };
    
    const allowedRoles = sectionAccess[sectionId] || ['student', 'lecturer', 'admin', 'superadmin'];
    return allowedRoles.includes(AppState.userRole);
}

function updateNavigationState(sectionId) {
    // Update nav items - remove active from all
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active to current section
    document.querySelectorAll('.nav-item').forEach(item => {
        const onclick = item.getAttribute('onclick') || '';
        const sectionMatch = onclick.match(/showSection\('(.+?)'\)/);
        if (sectionMatch && sectionMatch[1] === sectionId) {
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
    console.log('🔑 Using user_id:', AppState.currentUser.user_id);
    
    try {
        // Load role-specific data
        if (AppState.userRole === 'lecturer') {
            await loadLecturerData();
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

async function loadLecturerData() {
    console.log('📚 Loading lecturer data for user_id:', AppState.currentUser.user_id);
    
    try {
        // Load lecturer classes
        if (typeof loadTeacherClasses === 'function') {
            await loadTeacherClasses();
        }
        
        // Load pending submissions
        if (typeof loadPendingSubmissions === 'function') {
            await loadPendingSubmissions();
        }
        
    } catch (error) {
        console.error('Error loading lecturer data:', error);
    }
}

async function loadStudentData() {
    console.log('📖 Loading student data for user_id:', AppState.currentUser.user_id);
    
    try {
        // Load enrolled classes
        if (typeof loadEnrolledClasses === 'function') {
            await loadEnrolledClasses();
        }
        
        // Load pending assignments
        if (typeof loadPendingAssignments === 'function') {
            await loadPendingAssignments();
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
            style: {
                background: colors[type] || colors.info,
            },
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
        console.log('📚 Placeholder: Loading lecturer classes for user_id:', AppState.currentUser?.user_id);
    };
}

if (typeof loadEnrolledClasses === 'undefined') {
    window.loadEnrolledClasses = async function() {
        console.log('📖 Placeholder: Loading enrolled classes for user_id:', AppState.currentUser?.user_id);
    };
}

if (typeof loadAnnouncements === 'undefined') {
    window.loadAnnouncements = async function() {
        console.log('📢 Placeholder: Loading announcements');
    };
}

// Modal functions
if (typeof createAssignmentModal === 'undefined') {
    window.createAssignmentModal = function() {
        console.log('📝 Opening create assignment modal');
        const modal = document.getElementById('create-assignment-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };
}

if (typeof closeModal === 'undefined') {
    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    };
}

// Assignment functions
if (typeof saveAssignment === 'undefined') {
    window.saveAssignment = async function() {
        console.log('📝 Placeholder: Saving assignment');
        showToast('Assignment functionality not fully implemented', 'warning');
    };
}

// Announcement function
if (typeof sendAnnouncement === 'undefined') {
    window.sendAnnouncement = function() {
        console.log('📢 Placeholder: Sending announcement');
        showToast('Announcement functionality not implemented', 'warning');
    };
}

// =====================
// GLOBAL HELPER FUNCTION FOR OTHER MODULES
// =====================

// This function should be used by other modules (classroom.js, assignments.js, etc.)
// to get the correct user_id for queries
window.getCurrentUserId = function() {
    if (AppState.currentUser?.user_id) {
        return AppState.currentUser.user_id;
    }
    
    // Fallback to auth user ID
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
};

// =====================
// INITIALIZATION COMPLETE
// =====================

console.log('✅ Main.js loaded - Application controller ready');
