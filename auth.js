// In auth.js, update the handleUserSignedIn function:

function handleUserSignedIn(user) {
    window.appState.currentUser = user;
    showMainApp();
    loadUserData(user);
    
    // Role-based routing
    const userRole = user.user_metadata?.role || 'student';
    if (userRole === 'teacher') {
        redirectToTeacherDashboard();
    } else {
        redirectToStudentDashboard();
    }
}

// Add these functions to auth.js:

function redirectToTeacherDashboard() {
    console.log('👨‍🏫 Redirecting to teacher dashboard');
    
    // Update UI for teacher
    updateTeacherUI();
    
    // Load teacher-specific data
    loadTeacherDashboard();
    
    // Show teacher-specific sections
    showTeacherFeatures();
}

function redirectToStudentDashboard() {
    console.log('👨‍🎓 Redirecting to student dashboard');
    
    // Update UI for student
    updateStudentUI();
    
    // Load student-specific data
    loadStudentDashboard();
    
    // Hide teacher-only features
    hideTeacherFeatures();
}

function updateTeacherUI() {
    // Show teacher-specific elements
    const teacherElements = document.querySelectorAll('[data-teacher-only]');
    teacherElements.forEach(el => {
        el.style.display = '';
    });
    
    // Update header role
    const userRoleElement = document.querySelector('.user-role');
    if (userRoleElement) {
        userRoleElement.textContent = 'Teacher';
    }
    
    // Update quick actions for teacher
    updateTeacherQuickActions();
}

function updateStudentUI() {
    // Hide teacher-only elements
    const teacherElements = document.querySelectorAll('[data-teacher-only]');
    teacherElements.forEach(el => {
        el.style.display = 'none';
    });
    
    // Update header role
    const userRoleElement = document.querySelector('.user-role');
    if (userRoleElement) {
        userRoleElement.textContent = 'Student';
    }
    
    // Update quick actions for student
    updateStudentQuickActions();
}

function updateTeacherQuickActions() {
    const quickActions = document.querySelector('.quick-actions');
    if (quickActions) {
        quickActions.innerHTML = `
            <button class="quick-action-btn" onclick="createClass()">
                <i class="fas fa-plus-circle"></i>
                <span>Create Class</span>
            </button>
            <button class="quick-action-btn" onclick="createAssignment()">
                <i class="fas fa-tasks"></i>
                <span>Create Assignment</span>
            </button>
            <button class="quick-action-btn" onclick="showSection('grades')">
                <i class="fas fa-chart-bar"></i>
                <span>Grade Assignments</span>
            </button>
            <button class="quick-action-btn" onclick="sendAnnouncement()">
                <i class="fas fa-bullhorn"></i>
                <span>Send Announcement</span>
            </button>
        `;
    }
}

function updateStudentQuickActions() {
    const quickActions = document.querySelector('.quick-actions');
    if (quickActions) {
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
                <i class="fas fa-chart-line"></i>
                <span>View Grades</span>
            </button>
            <button class="quick-action-btn" onclick="showSection('resources')">
                <i class="fas fa-folder-open"></i>
                <span>Resources</span>
            </button>
        `;
    }
}

async function loadTeacherDashboard() {
    console.log('📊 Loading teacher dashboard');
    
    try {
        // Load teacher-specific data
        await Promise.all([
            loadTeacherClasses(),
            loadPendingSubmissions(),
            loadTeacherAnnouncements(),
            loadTeacherStats()
        ]);
        
    } catch (error) {
        console.error('Teacher dashboard error:', error);
    }
}

async function loadStudentDashboard() {
    console.log('📚 Loading student dashboard');
    
    try {
        // Load student-specific data
        await Promise.all([
            loadStudentClasses(),
            loadStudentAssignments(),
            loadStudentGrades(),
            loadStudentAnnouncements()
        ]);
        
    } catch (error) {
        console.error('Student dashboard error:', error);
    }
}

function showTeacherFeatures() {
    // Show teacher-only navigation items
    const teacherNavItems = document.querySelectorAll('.nav-item[data-teacher-only]');
    teacherNavItems.forEach(item => {
        item.style.display = '';
    });
}

function hideTeacherFeatures() {
    // Hide teacher-only navigation items
    const teacherNavItems = document.querySelectorAll('.nav-item[data-teacher-only]');
    teacherNavItems.forEach(item => {
        item.style.display = 'none';
    });
}
