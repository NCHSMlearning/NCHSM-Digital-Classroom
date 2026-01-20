// js/dashboard.js - Dashboard module
console.log('📊 Loading dashboard module...');

export function initDashboard() {
    console.log('📊 Initializing dashboard');
    
    // Listen for dashboard section
    document.addEventListener('sectionChanged', async (event) => {
        if (event.detail.section === 'dashboard') {
            await loadDashboard();
        }
    });
    
    // Listen for auth changes
    document.addEventListener('userAuthenticated', () => {
        loadUserData();
    });
}

async function loadDashboard() {
    console.log('🏠 Loading dashboard data');
    
    try {
        if (AppState.userRole === 'teacher') {
            await loadTeacherDashboard();
        } else {
            await loadStudentDashboard();
        }
        
        // Load common data
        await loadCommonData();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadTeacherDashboard() {
    console.log('👨‍🏫 Loading teacher dashboard');
    
    try {
        // Load teacher classes
        await loadTeacherClasses();
        
        // Load pending submissions
        await loadPendingSubmissions();
        
        // Update stats
        updateTeacherStats();
        
    } catch (error) {
        console.error('Error loading teacher dashboard:', error);
    }
}

async function loadStudentDashboard() {
    console.log('👨‍🎓 Loading student dashboard');
    
    try {
        // Load enrolled classes
        await loadEnrolledClasses();
        
        // Load pending assignments
        await loadPendingAssignments();
        
        // Update stats
        updateStudentStats();
        
    } catch (error) {
        console.error('Error loading student dashboard:', error);
    }
}

async function loadCommonData() {
    try {
        await loadAnnouncements();
        await loadNotifications();
        await loadCalendarEvents();
    } catch (error) {
        console.error('Error loading common data:', error);
    }
}

async function loadUserData() {
    if (!AppState.currentUser) return;
    
    console.log('👤 Loading user data');
    
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

// Data loading functions
async function loadTeacherClasses() {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('teacher_id', AppState.currentUser.id)
            .eq('is_active', true);
            
        if (error) throw error;
        
        AppState.teacherClasses = data || [];
        displayTeacherClasses();
        
    } catch (error) {
        console.error('Error loading teacher classes:', error);
    }
}

async function loadEnrolledClasses() {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('enrollments')
            .select('course:courses(*)')
            .eq('student_id', AppState.currentUser.id)
            .eq('status', 'active');
            
        if (error) throw error;
        
        AppState.enrolledClasses = data?.map(item => item.course) || [];
        displayEnrolledClasses();
        
    } catch (error) {
        console.error('Error loading enrolled classes:', error);
    }
}

// Display functions
function displayTeacherClasses() {
    const container = document.getElementById('upcoming-classes');
    if (!container) return;
    
    // Display logic here
}

function displayEnrolledClasses() {
    const container = document.getElementById('upcoming-classes');
    if (!container) return;
    
    // Display logic here
}

function updateTeacherStats() {
    // Update teacher stats
}

function updateStudentStats() {
    // Update student stats
}

// Make dashboard functions available
window.loadDashboard = loadDashboard;
