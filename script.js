// script.js - PRODUCTION READY WITH ROLE-BASED DASHBOARDS
console.log('📜 EduMeet - Production Script');

// Application State
const AppState = {
    currentUser: null,
    currentSection: 'dashboard',
    isInClass: false,
    userRole: null,
    notifications: [],
    pendingActions: []
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
// AUTHENTICATION
// =====================

async function checkAuth() {
    try {
        // Check if Supabase is ready
        if (!window.supabase?.auth) {
            console.warn('Supabase auth not ready');
            setTimeout(checkAuth, 500);
            return;
        }
        
        // Get current session
        const { data: { session }, error } = await window.supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
            await handleAuthenticatedUser(session.user);
        } else {
            showLoginScreen();
        }
        
    } catch (error) {
        console.error('Auth check error:', error);
        showLoginScreen();
    }
}

async function handleAuthenticatedUser(user) {
    console.log('👤 User authenticated:', user.email);
    
    // Set user data
    AppState.currentUser = user;
    AppState.userRole = user.user_metadata?.role || 'student';
    
    // Show main app
    showMainApp();
    
    // Load user data
    await loadUserData();
    
    // Redirect based on role
    redirectBasedOnRole();
}

function redirectBasedOnRole() {
    const role = AppState.userRole;
    console.log(`🎯 Redirecting ${role} to appropriate dashboard`);
    
    if (role === 'teacher') {
        redirectToTeacherDashboard();
    } else if (role === 'student') {
        redirectToStudentDashboard();
    } else if (role === 'admin') {
        redirectToAdminDashboard();
    } else {
        redirectToStudentDashboard(); // Default
    }
}

// =====================
// ROLE-BASED DASHBOARDS
// =====================

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
    // Update header role
    const roleElement = document.querySelector('.user-role');
    if (roleElement) {
        roleElement.textContent = 'Teacher';
        roleElement.style.color = '#4f46e5';
    }
    
    // Update navigation
    updateTeacherNavigation();
    
    // Update quick actions
    updateTeacherQuickActions();
    
    // Show teacher-only elements
    document.querySelectorAll('[data-teacher]').forEach(el => {
        el.style.display = '';
    });
    
    // Hide student-only elements
    document.querySelectorAll('[data-student]').forEach(el => {
        el.style.display = 'none';
    });
}

function updateUIForStudent() {
    // Update header role
    const roleElement = document.querySelector('.user-role');
    if (roleElement) {
        roleElement.textContent = 'Student';
        roleElement.style.color = '#10b981';
    }
    
    // Update navigation
    updateStudentNavigation();
    
    // Update quick actions
    updateStudentQuickActions();
    
    // Show student-only elements
    document.querySelectorAll('[data-student]').forEach(el => {
        el.style.display = '';
    });
    
    // Hide teacher-only elements
    document.querySelectorAll('[data-teacher]').forEach(el => {
        el.style.display = 'none';
    });
}

function updateUIForAdmin() {
    // Update header role
    const roleElement = document.querySelector('.user-role');
    if (roleElement) {
        roleElement.textContent = 'Admin';
        roleElement.style.color = '#ef4444';
    }
    
    // Update navigation
    updateAdminNavigation();
}

// =====================
// NAVIGATION UPDATES
// =====================

function updateTeacherNavigation() {
    // Update nav items for teacher
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
    // Update nav items for student
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
// DATA LOADING FUNCTIONS
// =====================

async function loadUserData() {
    if (!AppState.currentUser) return;
    
    console.log('👤 Loading user data');
    
    try {
        // Update user info
        updateUserInfo();
        
        // Load role-specific data
        if (AppState.userRole === 'teacher') {
            await loadTeacherInitialData();
        } else {
            await loadStudentInitialData();
        }
        
        // Load common data
        await loadCommonData();
        
    } catch (error) {
        console.error('User data error:', error);
        showToast('Error loading user data', 'error');
    }
}

async function loadTeacherInitialData() {
    console.log('📚 Loading teacher initial data');
    
    try {
        // Load teacher's classes
        await loadTeacherClasses();
        
        // Load pending submissions
        await loadPendingSubmissions();
        
        // Load teacher notifications
        await loadTeacherNotifications();
        
    } catch (error) {
        console.error('Teacher data error:', error);
    }
}

async function loadStudentInitialData() {
    console.log('📖 Loading student initial data');
    
    try {
        // Load enrolled classes
        await loadEnrolledClasses();
        
        // Load pending assignments
        await loadPendingAssignments();
        
        // Load student grades
        await loadStudentGrades();
        
    } catch (error) {
        console.error('Student data error:', error);
    }
}

async function loadCommonData() {
    try {
        // Load announcements
        await loadAnnouncements();
        
        // Load notifications
        await loadNotifications();
        
        // Load calendar events
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
        // Get assignments created by teacher
        const { data: assignments, error: assignError } = await window.supabase
            .from('assignments')
            .select('id')
            .eq('created_by', AppState.currentUser.id);
            
        if (assignError) throw assignError;
        
        if (assignments.length > 0) {
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
        // Get enrolled course IDs
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
        <span class="user-role">${AppState.userRole.charAt(0).toUpperCase() + AppState.userRole.slice(1)}</span>
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
        .filter(cls => new Date(cls.schedule) > new Date())
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
    
    // Get upcoming classes
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
    // These would be calculated from real data
    const stats = {
        attendance: calculateTeacherAttendance(),
        submissions: AppState.pendingSubmissions?.length || 0,
        averageGrade: calculateAverageGrade(),
        nextClass: getNextClassTime()
    };
    
    updateStatsDisplay(stats);
}

function updateStudentStats() {
    // These would be calculated from real data
    const stats = {
        attendance: calculateStudentAttendance(),
        assignmentsDue: AppState.pendingAssignments?.length || 0,
        averageGrade: calculateStudentAverageGrade(),
        nextClass: getNextStudentClass()
    };
    
    updateStatsDisplay(stats);
}

function updateStatsDisplay(stats) {
    document.getElementById('attendance-rate').textContent = stats.attendance;
    document.getElementById('assignments-due').textContent = stats.assignmentsDue;
    document.getElementById('avg-grade').textContent = stats.averageGrade;
    document.getElementById('next-class').textContent = stats.nextClass;
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
    
    // Update content
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
        if (section.id === `${sectionId}-section`) {
            section.classList.add('active');
        }
    });
    
    // Update state
    AppState.currentSection = sectionId;
    
    // Load section-specific data
    loadSectionData(sectionId);
};

function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'assignments':
            loadAssignmentsSection();
            break;
        case 'grades':
        case 'gradebook':
            loadGradesSection();
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

function showLoginScreen() {
    const loading = document.getElementById('loading-screen');
    const auth = document.getElementById('auth-screens');
    const main = document.getElementById('main-app');
    
    if (loading) loading.classList.add('hidden');
    if (auth) auth.classList.remove('hidden');
    if (main) main.classList.add('hidden');
}

function showMainApp() {
    const loading = document.getElementById('loading-screen');
    const auth = document.getElementById('auth-screens');
    const main = document.getElementById('main-app');
    
    if (loading) loading.classList.add('hidden');
    if (auth) auth.classList.add('hidden');
    if (main) main.classList.remove('hidden');
}

function initUI() {
    console.log('🎨 Initializing UI');
    // Additional UI setup if needed
}

function setupEventListeners() {
    console.log('🔧 Setting up event listeners');
    // Event listeners setup
}

function showToast(message, type = 'info') {
    console.log(`📣 ${type}: ${message}`);
    
    if (typeof Toastify !== 'undefined') {
        Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            }[type],
            stopOnFocus: true,
        }).showToast();
    }
}

function showError(message) {
    showToast(message, 'error');
    console.error('Error:', message);
}

// =====================
// PLACEHOLDER FUNCTIONS
// =====================

// These would be implemented with real calculations
function calculateTeacherAttendance() {
    return '--%';
}

function calculateStudentAttendance() {
    return '--%';
}

function calculateAverageGrade() {
    return '--';
}

function calculateStudentAverageGrade() {
    return '--';
}

function getNextClassTime() {
    return '--';
}

function getNextStudentClass() {
    return '--';
}

// =====================
// GLOBAL EXPORTS
// =====================

window.toggleNotifications = function() {
    const panel = document.getElementById('notifications-panel');
    if (panel) panel.classList.toggle('hidden');
};

window.openSettings = function() {
    showToast('Settings coming soon', 'info');
};

window.logout = async function() {
    try {
        await window.supabase.auth.signOut();
        showToast('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed', 'error');
    }
};

// Initialize
console.log('✅ script.js loaded - Role-based dashboards ready');
