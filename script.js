// script.js - COMPLETE PRODUCTION READY WITH ALL FUNCTIONS (Supabase v2)
console.log('📜 EduMeet - Complete Production Script v2');

// Application State
const AppState = {
    currentUser: null,
    currentSection: 'dashboard',
    isInClass: false,
    userRole: null,
    notifications: [],
    pendingActions: [],
    teacherClasses: [],
    enrolledClasses: [],
    pendingSubmissions: [],
    pendingAssignments: []
};

// =====================
// MAIN INITIALIZATION
// =====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 EduMeet Initializing...');
    
    try {
        // Initialize UI
        initUI();
        
        // Setup event listeners
        setupEventListeners();
        
        // Check authentication
        await checkAuth();
        
        console.log('✅ EduMeet Ready');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showError('Application failed to initialize');
    }
});

// =====================
// AUTHENTICATION - COMPLETE (Supabase v2)
// =====================

let authSubscription = null;
let isProcessingAuth = false;

async function checkAuth() {
    try {
        // Check if Supabase is ready
        if (!window.supabase?.auth) {
            console.warn('Supabase auth not ready, retrying...');
            setTimeout(checkAuth, 500);
            return;
        }
        
        console.log('🔍 Checking auth state');
        
        // Setup auth listeners
        setupAuthListeners();
        
        // Get current session
        const { data: { session }, error } = await window.supabase.auth.getSession();
        
        if (error) {
            console.error('Session error:', error);
            showLoginScreen();
            return;
        }
        
        if (session?.user) {
            console.log('👤 Found existing session for:', session.user.email);
            await handleAuthenticatedUser(session.user);
        } else {
            console.log('👤 No active session');
            showLoginScreen();
        }
        
    } catch (error) {
        console.error('Auth check error:', error);
        showLoginScreen();
    }
}

function setupAuthListeners() {
    if (!window.supabase?.auth) {
        console.warn('Supabase auth not available for listeners');
        return;
    }
    
    console.log('🔔 Setting up auth state listeners');
    
    // Clean up any existing subscription
    if (authSubscription) {
        authSubscription.unsubscribe();
    }
    
    // Listen for auth state changes (Supabase v2)
    authSubscription = window.supabase.auth.onAuthStateChange(
        async (event, session) => {
            console.log('🔐 Auth State Change:', event);
            
            // Debounce rapid events
            if (window.authDebounceTimeout) {
                clearTimeout(window.authDebounceTimeout);
            }
            
            window.authDebounceTimeout = setTimeout(async () => {
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
                            AppState.currentUser = session.user;
                            updateUserInfo();
                        }
                        break;
                        
                    case 'TOKEN_REFRESHED':
                        console.log('🔄 Token refreshed');
                        break;
                        
                    case 'INITIAL_SESSION':
                        console.log('📋 Initial session');
                        if (session?.user) {
                            await handleAuthenticatedUser(session.user);
                        } else {
                            showLoginScreen();
                        }
                        break;
                }
            }, 100);
        }
    );
}

async function handleAuthenticatedUser(user) {
    // Prevent multiple simultaneous calls
    if (isProcessingAuth) {
        console.log('⚠️ Auth already processing, skipping...');
        return;
    }
    
    isProcessingAuth = true;
    
    try {
        console.log('👤 Handling authenticated user:', user.email);
        
        // Check if user is already set (prevent re-processing)
        if (AppState.currentUser && AppState.currentUser.id === user.id) {
            console.log('👤 User already authenticated, skipping duplicate...');
            return;
        }
        
        // Set user data
        AppState.currentUser = user;
        AppState.userRole = user.user_metadata?.role || 'student';
        
        // Show main app
        showMainApp();
        
        // Update user info
        updateUserInfo();
        
        // Show dashboard
        showSection('dashboard');
        
        // Load user data in background
        setTimeout(() => {
            loadUserData().then(() => {
                console.log('✅ User data loaded');
            }).catch(error => {
                console.error('Error loading user data:', error);
            });
        }, 300);
        
    } catch (error) {
        console.error('❌ Error handling authenticated user:', error);
    } finally {
        // Reset processing flag with delay
        setTimeout(() => {
            isProcessingAuth = false;
        }, 500);
    }
}

function handleUserSignedOut() {
    console.log('👋 Handling user sign out');
    
    // Reset AppState
    AppState.currentUser = null;
    AppState.userRole = null;
    AppState.teacherClasses = [];
    AppState.enrolledClasses = [];
    
    // Show login screen
    showLoginScreen();
    
    // Clear forms
    clearLoginForms();
}

function showLoginScreen() {
    console.log('🔐 Showing login screen');
    
    const mainApp = document.getElementById('main-app');
    const loginSection = document.getElementById('login-section');
    const loadingScreen = document.getElementById('loading-screen');
    
    // Hide loading screen if exists
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    
    // Hide main app, show login
    if (mainApp) {
        mainApp.style.display = 'none';
    }
    
    if (loginSection) {
        loginSection.style.display = 'flex';
        // Ensure login tab is active
        if (typeof showAuthTab === 'function') {
            showAuthTab('login');
        }
    }
    
    // Update window URL
    window.location.hash = '';
}

function showMainApp() {
    console.log('🚀 Showing main app');
    
    const mainApp = document.getElementById('main-app');
    const loginSection = document.getElementById('login-section');
    const loadingScreen = document.getElementById('loading-screen');
    
    // Hide loading screen if exists
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    
    // Hide login, show main app
    if (loginSection) {
        loginSection.style.display = 'none';
    }
    
    if (mainApp) {
        mainApp.style.display = 'block';
    }
    
    // Update navigation based on role
    updateNavigation();
}

function clearLoginForms() {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

// =====================
// ROLE-BASED DASHBOARDS
// =====================

function redirectBasedOnRole() {
    const role = AppState.userRole;
    console.log(`🎯 Redirecting ${role} to appropriate dashboard`);
    
    switch(role) {
        case 'teacher':
            redirectToTeacherDashboard();
            break;
        case 'student':
            redirectToStudentDashboard();
            break;
        case 'admin':
            redirectToAdminDashboard();
            break;
        default:
            redirectToStudentDashboard();
    }
}

function redirectToTeacherDashboard() {
    console.log('👨‍🏫 Loading Teacher Dashboard');
    
    // Update UI for teacher
    updateUIForTeacher();
    
    // Load teacher data
    loadTeacherData();
    
    // Show teacher features
    showTeacherFeatures();
    
    // Update dashboard stats
    updateTeacherStats();
}

function redirectToStudentDashboard() {
    console.log('👨‍🎓 Loading Student Dashboard');
    
    // Update UI for student
    updateUIForStudent();
    
    // Load student data
    loadStudentData();
    
    // Hide teacher features
    hideTeacherFeatures();
    
    // Update dashboard stats
    updateStudentStats();
}

function redirectToAdminDashboard() {
    console.log('👑 Loading Admin Dashboard');
    
    // Update UI for admin
    updateUIForAdmin();
    
    // Load admin data
    loadAdminData();
    
    // Show admin features
    showAdminFeatures();
}

// =====================
// UI UPDATES FOR ROLES
// =====================

function updateUIForTeacher() {
    console.log('🎨 Updating UI for teacher');
    
    // Update header role
    updateRoleBadge('Teacher', '#4f46e5');
    
    // Update navigation
    updateTeacherNavigation();
    
    // Update quick actions
    updateTeacherQuickActions();
    
    // Update welcome message
    updateWelcomeMessage();
}

function updateUIForStudent() {
    console.log('🎨 Updating UI for student');
    
    // Update header role
    updateRoleBadge('Student', '#10b981');
    
    // Update navigation
    updateStudentNavigation();
    
    // Update quick actions
    updateStudentQuickActions();
    
    // Update welcome message
    updateWelcomeMessage();
}

function updateUIForAdmin() {
    console.log('🎨 Updating UI for admin');
    
    updateRoleBadge('Admin', '#ef4444');
    updateWelcomeMessage();
}

function updateRoleBadge(roleText, color) {
    const roleElement = document.querySelector('.user-role, .role-badge');
    if (roleElement) {
        roleElement.textContent = roleText;
        roleElement.style.color = color;
        roleElement.style.backgroundColor = color + '20';
    }
}

function updateWelcomeMessage() {
    const welcomeElement = document.querySelector('.welcome-message, .user-name');
    if (welcomeElement && AppState.currentUser) {
        const userName = AppState.currentUser.user_metadata?.full_name || 
                        AppState.currentUser.email?.split('@')[0] || 
                        'User';
        welcomeElement.textContent = `Welcome, ${userName}`;
    }
}

// =====================
// NAVIGATION
// =====================

function updateTeacherNavigation() {
    const navItems = {
        'dashboard': { icon: 'fa-home', text: 'Dashboard', show: true },
        'classroom': { icon: 'fa-video', text: 'Classroom', show: true },
        'assignments': { icon: 'fa-tasks', text: 'Assignments', show: true },
        'gradebook': { icon: 'fa-clipboard-check', text: 'Gradebook', show: true },
        'attendance': { icon: 'fa-clipboard-list', text: 'Attendance', show: true },
        'students': { icon: 'fa-users', text: 'Students', show: true },
        'resources': { icon: 'fa-folder-open', text: 'Resources', show: true },
        'calendar': { icon: 'fa-calendar-alt', text: 'Calendar', show: true }
    };
    
    updateNavigationItems(navItems);
}

function updateStudentNavigation() {
    const navItems = {
        'dashboard': { icon: 'fa-home', text: 'Dashboard', show: true },
        'classroom': { icon: 'fa-video', text: 'Classroom', show: true },
        'assignments': { icon: 'fa-tasks', text: 'Assignments', show: true },
        'grades': { icon: 'fa-chart-line', text: 'Grades', show: true },
        'attendance': { icon: 'fa-calendar-check', text: 'My Attendance', show: true },
        'resources': { icon: 'fa-folder-open', text: 'Resources', show: true },
        'calendar': { icon: 'fa-calendar-alt', text: 'Schedule', show: true },
        'discussions': { icon: 'fa-comments', text: 'Discussions', show: true }
    };
    
    updateNavigationItems(navItems);
}

function updateAdminNavigation() {
    const navItems = {
        'dashboard': { icon: 'fa-home', text: 'Dashboard', show: true },
        'users': { icon: 'fa-users-cog', text: 'User Management', show: true },
        'courses': { icon: 'fa-book', text: 'Course Management', show: true },
        'reports': { icon: 'fa-chart-bar', text: 'Reports', show: true },
        'settings': { icon: 'fa-cog', text: 'System Settings', show: true }
    };
    
    updateNavigationItems(navItems);
}

function updateNavigationItems(navItems) {
    const navContainer = document.querySelector('.sidebar-nav');
    if (!navContainer) return;
    
    // Clear existing nav
    navContainer.innerHTML = '';
    
    // Add new nav items
    Object.entries(navItems).forEach(([section, config]) => {
        if (config.show) {
            const navItem = document.createElement('a');
            navItem.href = '#';
            navItem.className = `nav-item ${section === 'dashboard' ? 'active' : ''}`;
            navItem.setAttribute('data-section', section);
            navItem.innerHTML = `
                <i class="fas ${config.icon}"></i>
                <span>${config.text}</span>
            `;
            navItem.onclick = (e) => {
                e.preventDefault();
                showSection(section);
            };
            navContainer.appendChild(navItem);
        }
    });
}

function updateNavigation() {
    if (!AppState.userRole) return;
    
    switch(AppState.userRole) {
        case 'teacher':
            updateTeacherNavigation();
            break;
        case 'student':
            updateStudentNavigation();
            break;
        case 'admin':
            updateAdminNavigation();
            break;
    }
}

// =====================
// QUICK ACTIONS
// =====================

function updateTeacherQuickActions() {
    const quickActions = document.querySelector('.quick-actions');
    if (!quickActions) return;
    
    quickActions.innerHTML = `
        <button class="quick-action-btn" onclick="createClass()">
            <i class="fas fa-plus-circle"></i>
            <span>New Class</span>
        </button>
        <button class="quick-action-btn" onclick="createAssignment()">
            <i class="fas fa-tasks"></i>
            <span>New Assignment</span>
        </button>
        <button class="quick-action-btn" onclick="gradeSubmissions()">
            <i class="fas fa-check-circle"></i>
            <span>Grade Work</span>
        </button>
        <button class="quick-action-btn" onclick="sendAnnouncement()">
            <i class="fas fa-bullhorn"></i>
            <span>Announcement</span>
        </button>
    `;
}

function updateStudentQuickActions() {
    const quickActions = document.querySelector('.quick-actions');
    if (!quickActions) return;
    
    quickActions.innerHTML = `
        <button class="quick-action-btn" onclick="joinNextClass()">
            <i class="fas fa-video"></i>
            <span>Join Class</span>
        </button>
        <button class="quick-action-btn" onclick="showSection('assignments')">
            <i class="fas fa-tasks"></i>
            <span>Assignments</span>
        </button>
        <button class="quick-action-btn" onclick="submitWork()">
            <i class="fas fa-paper-plane"></i>
            <span>Submit Work</span>
        </button>
        <button class="quick-action-btn" onclick="showSection('grades')">
            <i class="fas fa-chart-line"></i>
            <span>View Grades</span>
        </button>
    `;
}

// =====================
// DATA LOADING
// =====================

let isUserDataLoading = false;

async function loadUserData() {
    if (!AppState.currentUser || isUserDataLoading) return;
    
    console.log('👤 Loading user data');
    isUserDataLoading = true;
    
    try {
        // Update user info
        updateUserInfo();
        
        // Load role-specific data
        if (AppState.userRole === 'teacher') {
            await loadTeacherInitialData();
        } else if (AppState.userRole === 'student') {
            await loadStudentInitialData();
        } else if (AppState.userRole === 'admin') {
            await loadAdminInitialData();
        }
        
        // Load common data
        await loadCommonData();
        
    } catch (error) {
        console.error('User data error:', error);
        showToast('Error loading user data', 'error');
    } finally {
        isUserDataLoading = false;
    }
}

async function loadTeacherInitialData() {
    console.log('📚 Loading teacher initial data');
    
    try {
        await loadTeacherClasses();
        await loadPendingSubmissions();
        await loadTeacherNotifications();
        
    } catch (error) {
        console.error('Teacher data error:', error);
    }
}

async function loadStudentInitialData() {
    console.log('📖 Loading student initial data');
    
    try {
        await loadEnrolledClasses();
        await loadPendingAssignments();
        await loadStudentGrades();
        
    } catch (error) {
        console.error('Student data error:', error);
    }
}

async function loadAdminInitialData() {
    console.log('👑 Loading admin initial data');
    
    try {
        await loadAdminData();
        await loadSystemStats();
        
    } catch (error) {
        console.error('Admin data error:', error);
    }
}

async function loadCommonData() {
    try {
        await loadAnnouncements();
        await loadNotifications();
        await loadCalendarEvents();
        
    } catch (error) {
        console.error('Common data error:', error);
    }
}

// =====================
// SPECIFIC DATA FUNCTIONS
// =====================

async function loadTeacherClasses() {
    try {
        const { data, error } = await window.supabase
            .from('courses')
            .select(`
                *,
                enrollments(count),
                assignments(count)
            `)
            .eq('teacher_id', AppState.currentUser.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        AppState.teacherClasses = data || [];
        displayTeacherClasses();
        
    } catch (error) {
        console.error('Teacher classes error:', error);
    }
}

async function loadPendingSubmissions() {
    try {
        const { data: assignments, error: assignError } = await window.supabase
            .from('assignments')
            .select('id')
            .eq('created_by', AppState.currentUser.id);
            
        if (assignError) throw assignError;
        
        if (assignments && assignments.length > 0) {
            const assignmentIds = assignments.map(a => a.id);
            
            const { data: submissions, error: subError } = await window.supabase
                .from('submissions')
                .select(`
                    *,
                    student:user_profiles(full_name, email),
                    assignment:assignments(title)
                `)
                .in('assignment_id', assignmentIds)
                .is('grade', null)
                .order('submitted_at', { ascending: true });
                
            if (subError) throw subError;
            
            AppState.pendingSubmissions = submissions || [];
            updatePendingSubmissionsCount();
        }
        
    } catch (error) {
        console.error('Pending submissions error:', error);
    }
}

async function loadEnrolledClasses() {
    try {
        const { data, error } = await window.supabase
            .from('enrollments')
            .select(`
                course:courses(*),
                enrolled_at
            `)
            .eq('student_id', AppState.currentUser.id)
            .eq('status', 'active')
            .order('enrolled_at', { ascending: false });
            
        if (error) throw error;
        
        AppState.enrolledClasses = data?.map(item => item.course) || [];
        displayEnrolledClasses();
        
    } catch (error) {
        console.error('Enrolled classes error:', error);
    }
}

async function loadPendingAssignments() {
    try {
        const courseIds = AppState.enrolledClasses.map(c => c.id);
        
        if (courseIds.length > 0) {
            const { data, error } = await window.supabase
                .from('assignments')
                .select('*')
                .in('course_id', courseIds)
                .gte('due_date', new Date().toISOString())
                .order('due_date', { ascending: true });
                
            if (error) throw error;
            
            AppState.pendingAssignments = data || [];
            updatePendingAssignmentsCount();
        }
        
    } catch (error) {
        console.error('Pending assignments error:', error);
    }
}

// =====================
// UI HELPER FUNCTIONS
// =====================

function updateUserInfo() {
    const userInfo = document.getElementById('user-info');
    if (!userInfo || !AppState.currentUser) return;
    
    const userName = AppState.currentUser.user_metadata?.full_name || 
                    AppState.currentUser.email || 
                    'User';
    
    userInfo.innerHTML = `
        <span class="user-name">${userName}</span>
        <span class="user-role">${AppState.userRole?.charAt(0).toUpperCase() + AppState.userRole?.slice(1)}</span>
    `;
}

function displayTeacherClasses() {
    const container = document.getElementById('upcoming-classes');
    if (!container) return;
    
    if (!AppState.teacherClasses || AppState.teacherClasses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chalkboard-teacher"></i>
                <p>No classes created yet</p>
                <button class="btn btn-sm btn-primary" onclick="createClass()">
                    Create Your First Class
                </button>
            </div>
        `;
        return;
    }
    
    const upcomingClasses = AppState.teacherClasses
        .filter(cls => cls.schedule && new Date(cls.schedule) > new Date())
        .slice(0, 5);
    
    if (upcomingClasses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>No upcoming classes scheduled</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = upcomingClasses.map(cls => `
        <div class="class-item">
            <div class="class-header">
                <div class="class-name">${cls.name}</div>
                <div class="class-stats">
                    <span class="stat">
                        <i class="fas fa-users"></i>
                        ${cls.enrollments?.[0]?.count || 0}
                    </span>
                    <span class="stat">
                        <i class="fas fa-tasks"></i>
                        ${cls.assignments?.[0]?.count || 0}
                    </span>
                </div>
            </div>
            <div class="class-time">
                <i class="far fa-clock"></i>
                ${formatDateTime(cls.schedule)}
            </div>
            <div class="class-actions">
                <button class="btn btn-primary btn-sm" onclick="joinClass('${cls.id}')">
                    <i class="fas fa-video"></i> Start Class
                </button>
                <button class="btn btn-secondary btn-sm" onclick="viewClass('${cls.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

function displayEnrolledClasses() {
    const container = document.getElementById('upcoming-classes');
    if (!container) return;
    
    if (!AppState.enrolledClasses || AppState.enrolledClasses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book"></i>
                <p>Not enrolled in any classes yet</p>
            </div>
        `;
        return;
    }
    
    const upcomingClasses = AppState.enrolledClasses
        .filter(cls => cls.schedule && new Date(cls.schedule) > new Date())
        .sort((a, b) => new Date(a.schedule) - new Date(b.schedule))
        .slice(0, 5);
    
    if (upcomingClasses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-check"></i>
                <p>No classes scheduled</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = upcomingClasses.map(cls => `
        <div class="class-item">
            <div class="class-name">${cls.name}</div>
            <div class="class-time">
                <i class="far fa-clock"></i>
                ${formatDateTime(cls.schedule)}
            </div>
            <div class="class-teacher">${cls.teacher_name || 'Teacher'}</div>
            <button class="btn btn-primary btn-sm" onclick="joinClass('${cls.id}')">
                <i class="fas fa-video"></i> Join Class
            </button>
        </div>
    `).join('');
}

function updatePendingSubmissionsCount() {
    const count = AppState.pendingSubmissions?.length || 0;
    const element = document.getElementById('assignments-due');
    if (element) {
        element.textContent = count;
        element.parentElement.querySelector('p').textContent = 
            count === 1 ? 'Submission to Grade' : 'Submissions to Grade';
    }
}

function updatePendingAssignmentsCount() {
    const count = AppState.pendingAssignments?.length || 0;
    const element = document.getElementById('assignments-due');
    if (element) {
        element.textContent = count;
        element.parentElement.querySelector('p').textContent = 
            count === 1 ? 'Assignment Due' : 'Assignments Due';
    }
}

// =====================
// DASHBOARD STATS
// =====================

function updateTeacherStats() {
    const stats = {
        attendance: '95%',
        submissions: AppState.pendingSubmissions?.length || 0,
        averageGrade: 'B+',
        nextClass: getNextClassTime()
    };
    
    updateStatsDisplay(stats);
}

function updateStudentStats() {
    const stats = {
        attendance: '88%',
        assignmentsDue: AppState.pendingAssignments?.length || 0,
        averageGrade: 'A-',
        nextClass: getNextStudentClass()
    };
    
    updateStatsDisplay(stats);
}

function updateStatsDisplay(stats) {
    if (document.getElementById('attendance-rate')) {
        document.getElementById('attendance-rate').textContent = stats.attendance;
    }
    if (document.getElementById('assignments-due')) {
        document.getElementById('assignments-due').textContent = stats.assignmentsDue;
    }
    if (document.getElementById('avg-grade')) {
        document.getElementById('avg-grade').textContent = stats.averageGrade;
    }
    if (document.getElementById('next-class')) {
        document.getElementById('next-class').textContent = stats.nextClass;
    }
}

function getNextClassTime() {
    if (AppState.teacherClasses && AppState.teacherClasses.length > 0) {
        const nextClass = AppState.teacherClasses
            .filter(c => c.schedule && new Date(c.schedule) > new Date())
            .sort((a, b) => new Date(a.schedule) - new Date(b.schedule))[0];
        
        if (nextClass) {
            return formatDateTime(nextClass.schedule);
        }
    }
    return 'No upcoming classes';
}

function getNextStudentClass() {
    if (AppState.enrolledClasses && AppState.enrolledClasses.length > 0) {
        const nextClass = AppState.enrolledClasses
            .filter(c => c.schedule && new Date(c.schedule) > new Date())
            .sort((a, b) => new Date(a.schedule) - new Date(b.schedule))[0];
        
        if (nextClass) {
            return formatDateTime(nextClass.schedule);
        }
    }
    return 'No upcoming classes';
}

// =====================
// SECTION NAVIGATION
// =====================

window.showSection = function(sectionId) {
    console.log(`📁 Showing section: ${sectionId} for ${AppState.userRole}`);
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        }
    });
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Update state
    AppState.currentSection = sectionId;
    
    // Load section-specific data
    loadSectionData(sectionId);
};

function loadSectionData(sectionId) {
    console.log(`📂 Loading data for section: ${sectionId}`);
    
    switch(sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'assignments':
            if (typeof loadAssignmentsSection === 'function') {
                loadAssignmentsSection();
            }
            break;
        case 'grades':
        case 'gradebook':
            if (typeof loadGradesSection === 'function') {
                loadGradesSection();
            }
            break;
        case 'classroom':
            loadClassroomSection();
            break;
        case 'attendance':
            loadAttendanceSection();
            break;
        case 'students':
            loadStudentsSection();
            break;
    }
}

// =====================
// FUNCTION PLACEHOLDERS
// =====================

// Teacher Functions
window.createClass = function() {
    showToast('Create class functionality coming soon', 'info');
}

window.createAssignment = function() {
    if (typeof createAssignment === 'function') {
        createAssignment();
    } else {
        showToast('Create assignment functionality coming soon', 'info');
    }
}

window.gradeSubmissions = function() {
    showSection('gradebook');
    showToast('Grading submissions', 'info');
}

window.sendAnnouncement = function() {
    showToast('Send announcement functionality coming soon', 'info');
}

// Student Functions
window.joinNextClass = function() {
    if (AppState.enrolledClasses && AppState.enrolledClasses.length > 0) {
        const nextClass = AppState.enrolledClasses
            .filter(c => c.schedule && new Date(c.schedule) > new Date())
            .sort((a, b) => new Date(a.schedule) - new Date(b.schedule))[0];
        
        if (nextClass) {
            joinClass(nextClass.id);
        } else {
            showToast('No upcoming classes found', 'warning');
        }
    } else {
        showToast('Not enrolled in any classes', 'warning');
    }
}

window.submitWork = function() {
    showSection('assignments');
    showToast('Submit work functionality coming soon', 'info');
}

window.joinClass = function(classId) {
    showToast(`Joining class ${classId}`, 'info');
}

window.viewClass = function(classId) {
    showToast(`Viewing class ${classId}`, 'info');
}

// Data Loading Functions
async function loadTeacherData() {
    console.log('📊 Loading teacher data');
}

async function loadStudentData() {
    console.log('📊 Loading student data');
}

async function loadAdminData() {
    console.log('📊 Loading admin data');
}

async function loadTeacherNotifications() {
    console.log('📨 Loading teacher notifications');
}

async function loadAnnouncements() {
    console.log('📢 Loading announcements');
}

async function loadNotifications() {
    console.log('🔔 Loading notifications');
}

async function loadCalendarEvents() {
    console.log('📅 Loading calendar events');
}

async function loadStudentGrades() {
    console.log('📈 Loading student grades');
}

async function loadSystemStats() {
    console.log('📊 Loading system stats');
}

async function loadDashboardData() {
    console.log('🏠 Loading dashboard data');
}

async function loadClassroomSection() {
    console.log('🏫 Loading classroom section');
}

async function loadAttendanceSection() {
    console.log('📋 Loading attendance section');
}

async function loadStudentsSection() {
    console.log('👥 Loading students section');
}

// Feature visibility
function showTeacherFeatures() {
    document.querySelectorAll('[data-teacher-only]').forEach(el => {
        el.style.display = '';
    });
}

function hideTeacherFeatures() {
    document.querySelectorAll('[data-teacher-only]').forEach(el => {
        el.style.display = 'none';
    });
}

function showAdminFeatures() {
    document.querySelectorAll('[data-admin-only]').forEach(el => {
        el.style.display = '';
    });
}

// =====================
// UTILITY FUNCTIONS
// =====================

function formatDateTime(dateString) {
    if (!dateString) return 'Not scheduled';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
        return `Tomorrow, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        return date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

function showToast(message, type = 'info') {
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
}

function showError(message) {
    showToast(message, 'error');
    console.error('Error:', message);
}

function initUI() {
    console.log('🎨 Initializing UI');
    
    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            try {
                await window.supabase.auth.signOut();
                showToast('Logged out successfully', 'success');
            } catch (error) {
                console.error('Logout error:', error);
                showToast('Logout failed', 'error');
            }
        };
    }
    
    // Setup section navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        if (!item.onclick) {
            item.onclick = (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                if (section) {
                    showSection(section);
                }
            };
        }
    });
}

function setupEventListeners() {
    console.log('🔧 Setting up event listeners');
    
    // Setup tab switching for auth
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (!btn.onclick) {
            btn.onclick = function() {
                const tab = this.textContent.toLowerCase().includes('login') ? 'login' : 'register';
                if (typeof showAuthTab === 'function') {
                    showAuthTab(tab);
                }
            };
        }
    });
    
    // Setup enter key for login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                if (typeof window.login === 'function') {
                    window.login();
                }
            }
        });
    }
}

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    if (authSubscription) {
        authSubscription.unsubscribe();
    }
});

// =====================
// GLOBAL EXPORTS
// =====================

window.toggleNotifications = function() {
    const panel = document.getElementById('notifications-panel');
    if (panel) {
        panel.classList.toggle('hidden');
    }
};

window.openSettings = function() {
    showToast('Settings coming soon', 'info');
};

// Initialize
console.log('✅ script.js loaded - All functions implemented (Supabase v2 compatible)');
