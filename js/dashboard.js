// js/dashboard.js - Dashboard Module
console.log('📊 Loading dashboard module...');

// =====================
// DASHBOARD STATE
// =====================
const DashboardState = {
    upcomingClasses: [],
    announcements: [],
    notifications: [],
    statistics: {
        attendance: '--',
        assignmentsDue: '--',
        averageGrade: '--',
        nextClass: '--'
    }
};

// =====================
// MODULE INITIALIZATION
// =====================

// Initialize dashboard module
export function initDashboard() {
    console.log('📊 Initializing dashboard module');
    
    // Listen for section changes
    document.addEventListener('sectionChanged', async function(event) {
        if (event.detail.section === 'dashboard') {
            console.log('🏠 Loading dashboard section');
            await loadDashboard();
        }
    });
    
    // Listen for auth changes (custom event)
    document.addEventListener('userAuthenticated', function() {
        console.log('👤 User authenticated, loading dashboard data');
        loadUserData();
    });
    
    // Setup dashboard event listeners
    setupDashboardListeners();
}

// Setup dashboard event listeners
function setupDashboardListeners() {
    // Create class button
    const createClassBtn = document.querySelector('[onclick="createClass()"]');
    if (createClassBtn) {
        createClassBtn.addEventListener('click', createClass);
    }
    
    // Quick action buttons
    const quickActionButtons = document.querySelectorAll('.quick-action-btn');
    quickActionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.querySelector('span').textContent.toLowerCase();
            handleQuickAction(action);
        });
    });
}

// =====================
// MAIN DASHBOARD FUNCTIONS
// =====================

// Load dashboard
async function loadDashboard() {
    console.log('📊 Loading dashboard for:', AppState.userRole);
    
    try {
        // Show loading state
        showDashboardLoading();
        
        // Update user info
        updateDashboardUserInfo();
        
        // Load role-specific dashboard
        if (AppState.userRole === 'teacher') {
            await loadTeacherDashboard();
        } else {
            await loadStudentDashboard();
        }
        
        // Load common data
        await loadCommonData();
        
        // Update statistics
        updateDashboardStatistics();
        
        // Hide loading state
        hideDashboardLoading();
        
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        showToast('Error loading dashboard', 'error');
        hideDashboardLoading();
    }
}

// Load teacher dashboard
async function loadTeacherDashboard() {
    console.log('👨‍🏫 Loading teacher dashboard');
    
    try {
        // Load teacher classes
        await loadTeacherClasses();
        
        // Load pending submissions
        await loadPendingSubmissions();
        
        // Load teacher-specific data
        await loadTeacherSpecificData();
        
        // Update quick actions for teacher
        updateTeacherQuickActions();
        
        // Update teacher stats
        updateTeacherStats();
        
    } catch (error) {
        console.error('Error loading teacher dashboard:', error);
    }
}

// Load student dashboard
async function loadStudentDashboard() {
    console.log('👨‍🎓 Loading student dashboard');
    
    try {
        // Load enrolled classes
        await loadEnrolledClasses();
        
        // Load pending assignments
        await loadPendingAssignments();
        
        // Load student-specific data
        await loadStudentSpecificData();
        
        // Update quick actions for student
        updateStudentQuickActions();
        
        // Update student stats
        updateStudentStats();
        
    } catch (error) {
        console.error('Error loading student dashboard:', error);
    }
}

// Load common dashboard data
async function loadCommonData() {
    try {
        await loadAnnouncements();
        await loadNotifications();
        await loadCalendarEvents();
    } catch (error) {
        console.error('Error loading common data:', error);
    }
}

// Load user data (called on auth)
async function loadUserData() {
    if (!AppState.currentUser) return;
    
    console.log('👤 Loading user data for:', AppState.userRole);
    
    try {
        if (AppState.userRole === 'teacher') {
            await loadTeacherData();
        } else {
            await loadStudentData();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// =====================
// DATA LOADING FUNCTIONS
// =====================

// Load teacher classes
async function loadTeacherClasses() {
    try {
        if (!AppState.currentUser) return;
        
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
        console.error('Error loading teacher classes:', error);
        AppState.teacherClasses = [];
        displayTeacherClasses();
    }
}

// Load enrolled classes
async function loadEnrolledClasses() {
    try {
        if (!AppState.currentUser) return;
        
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
        console.error('Error loading enrolled classes:', error);
        AppState.enrolledClasses = [];
        displayEnrolledClasses();
    }
}

// Load pending submissions (for teachers)
async function loadPendingSubmissions() {
    try {
        if (!AppState.currentUser) return;
        
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
        AppState.pendingSubmissions = [];
    }
}

// Load pending assignments (for students)
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
        AppState.pendingAssignments = [];
    }
}

// =====================
// DISPLAY FUNCTIONS
// =====================

// Display teacher classes
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

// Display enrolled classes
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

// Update pending submissions count
function updatePendingSubmissionsCount() {
    const count = AppState.pendingSubmissions?.length || 0;
    const element = document.getElementById('assignments-due');
    if (element) {
        element.textContent = count;
        element.parentElement.querySelector('p').textContent = 
            count === 1 ? 'Submission to Grade' : 'Submissions to Grade';
    }
}

// Update pending assignments count
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
// DASHBOARD STATISTICS
// =====================

// Update teacher statistics
function updateTeacherStats() {
    const stats = {
        attendance: calculateTeacherAttendance(),
        submissions: AppState.pendingSubmissions?.length || 0,
        averageGrade: calculateAverageGrade(),
        nextClass: getNextTeacherClass()
    };
    
    updateStatsDisplay(stats);
}

// Update student statistics
function updateStudentStats() {
    const stats = {
        attendance: calculateStudentAttendance(),
        assignmentsDue: AppState.pendingAssignments?.length || 0,
        averageGrade: calculateStudentAverageGrade(),
        nextClass: getNextStudentClass()
    };
    
    updateStatsDisplay(stats);
}

// Update dashboard statistics display
function updateStatsDisplay(stats) {
    const attendanceEl = document.getElementById('attendance-rate');
    const assignmentsEl = document.getElementById('assignments-due');
    const gradeEl = document.getElementById('avg-grade');
    const nextClassEl = document.getElementById('next-class');
    
    if (attendanceEl) attendanceEl.textContent = stats.attendance;
    if (assignmentsEl) assignmentsEl.textContent = stats.assignmentsDue;
    if (gradeEl) gradeEl.textContent = stats.averageGrade;
    if (nextClassEl) nextClassEl.textContent = stats.nextClass;
}

// Update dashboard statistics
function updateDashboardStatistics() {
    if (AppState.userRole === 'teacher') {
        updateTeacherStats();
    } else {
        updateStudentStats();
    }
}

// =====================
// QUICK ACTIONS
// =====================

// Update teacher quick actions
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

// Update student quick actions
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

// Handle quick action clicks
function handleQuickAction(action) {
    console.log('⚡ Quick action:', action);
    
    switch(action.toLowerCase()) {
        case 'join class':
            joinNextClass();
            break;
        case 'new class':
            createClass();
            break;
        case 'new assignment':
            createAssignment();
            break;
        case 'grade work':
            gradeSubmissions();
            break;
        case 'announcement':
            sendAnnouncement();
            break;
        case 'submit work':
            submitWork();
            break;
        case 'view grades':
            showSection('grades');
            break;
        case 'assignments':
            showSection('assignments');
            break;
    }
}

// =====================
// UTILITY FUNCTIONS
// =====================

// Show dashboard loading
function showDashboardLoading() {
    const dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'dashboard-loading';
        loadingDiv.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading dashboard...</p>
            </div>
        `;
        dashboardSection.appendChild(loadingDiv);
    }
}

// Hide dashboard loading
function hideDashboardLoading() {
    const loadingDiv = document.querySelector('.dashboard-loading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Update dashboard user info
function updateDashboardUserInfo() {
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg && AppState.currentUser) {
        const userName = AppState.currentUser.user_metadata?.full_name || 
                        AppState.currentUser.email?.split('@')[0] || 
                        'User';
        welcomeMsg.textContent = `Welcome back, ${userName}!`;
    }
}

// =====================
// CALCULATION FUNCTIONS (Placeholders)
// =====================

function calculateTeacherAttendance() {
    return '95%';
}

function calculateStudentAttendance() {
    return '88%';
}

function calculateAverageGrade() {
    return 'B+';
}

function calculateStudentAverageGrade() {
    return 'A-';
}

function getNextTeacherClass() {
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

// Format date time
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

// =====================
// PLACEHOLDER FUNCTIONS
// =====================

async function loadTeacherSpecificData() {
    console.log('📚 Loading teacher specific data');
    // Implementation
}

async function loadStudentSpecificData() {
    console.log('📖 Loading student specific data');
    // Implementation
}

async function loadTeacherData() {
    console.log('📊 Loading teacher data');
    // Implementation
}

async function loadStudentData() {
    console.log('📊 Loading student data');
    // Implementation
}

async function loadAnnouncements() {
    console.log('📢 Loading announcements');
    // Implementation
}

async function loadNotifications() {
    console.log('🔔 Loading notifications');
    // Implementation
}

async function loadCalendarEvents() {
    console.log('📅 Loading calendar events');
    // Implementation
}

// =====================
// MODULE EXPORTS
// =====================

// Export dashboard functions
window.loadDashboard = loadDashboard;
window.loadTeacherClasses = loadTeacherClasses;
window.loadEnrolledClasses = loadEnrolledClasses;
window.displayTeacherClasses = displayTeacherClasses;
window.displayEnrolledClasses = displayEnrolledClasses;

console.log('✅ dashboard.js loaded - Dashboard module ready');
