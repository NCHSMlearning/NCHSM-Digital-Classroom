// js/assignments.js - Assignments & Gradebook Module
console.log('📝 Loading assignments module...');

// =====================
// MODULE STATE
// =====================
const AssignmentsState = {
    currentAssignments: [],
    currentFilter: 'all',
    submissions: [],
    grades: []
};

// =====================
// MODULE INITIALIZATION
// =====================

// Initialize assignments module
function initAssignments() {
    console.log('📝 Initializing assignments module');
    
    // Listen for section changes
    document.addEventListener('sectionChanged', async function(event) {
        if (event.detail.section === 'assignments') {
            console.log('📝 Loading assignments section');
            await loadAssignmentsSection();
        } else if (event.detail.section === 'grades') {
            console.log('📊 Loading grades section');
            await loadGradesSection();
        }
    });
    
    // Setup event listeners
    setupAssignmentsListeners();
}

// Setup assignments event listeners
function setupAssignmentsListeners() {
    // Setup filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter || 'all';
            filterAssignments(filter);
        });
    });
    
    // Setup create assignment button (if exists)
    const createBtn = document.getElementById('create-assignment-btn');
    if (createBtn) {
        createBtn.addEventListener('click', createAssignment);
    }
    
    // Setup export grades button
    const exportBtn = document.getElementById('export-grades-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportGrades);
    }
}

// =====================
// ASSIGNMENTS SECTION
// =====================

// Load assignments section
async function loadAssignmentsSection() {
    console.log('📝 Loading assignments section for:', AppState.userRole);
    
    try {
        // Show loading state
        const assignmentList = document.getElementById('assignment-list');
        if (assignmentList) {
            assignmentList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading assignments...</div>';
        }
        
        // Load based on user role
        if (AppState.userRole === 'teacher') {
            await loadTeacherAssignments();
        } else {
            await loadStudentAssignments();
        }
        
    } catch (error) {
        console.error('❌ Error loading assignments section:', error);
        showToast('Error loading assignments', 'error');
        
        // Show error state
        const assignmentList = document.getElementById('assignment-list');
        if (assignmentList) {
            assignmentList.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load assignments</p>
                    <button class="btn btn-sm btn-primary" onclick="loadAssignmentsSection()">
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

// Load assignments for teachers
async function loadTeacherAssignments() {
    try {
        const { data, error } = await window.supabase
            .from('assignments')
            .select(`
                *,
                courses(name),
                submissions(count),
                submissions_aggregate:submissions(aggregate: {
                    count: true,
                    avg: { grade: true }
                })
            `)
            .eq('created_by', AppState.currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        AssignmentsState.currentAssignments = data || [];
        renderTeacherAssignments();
        
    } catch (error) {
        console.error('Error loading teacher assignments:', error);
        AssignmentsState.currentAssignments = [];
        renderTeacherAssignments();
    }
}

// Load assignments for students
async function loadStudentAssignments() {
    try {
        // First get enrolled courses
        const { data: enrollments, error: enrollError } = await window.supabase
            .from('enrollments')
            .select('course_id')
            .eq('student_id', AppState.currentUser.id)
            .eq('status', 'active');
        
        if (enrollError) throw enrollError;
        
        if (!enrollments || enrollments.length === 0) {
            AssignmentsState.currentAssignments = [];
            renderStudentAssignments();
            return;
        }
        
        const courseIds = enrollments.map(e => e.course_id);
        
        // Get assignments for enrolled courses
        const { data, error } = await window.supabase
            .from('assignments')
            .select(`
                *,
                courses(name),
                submissions(
                    id,
                    grade,
                    feedback,
                    submitted_at
                )
            `)
            .in('course_id', courseIds)
            .order('due_date', { ascending: true });
        
        if (error) throw error;
        
        AssignmentsState.currentAssignments = data || [];
        renderStudentAssignments();
        
    } catch (error) {
        console.error('Error loading student assignments:', error);
        AssignmentsState.currentAssignments = [];
        renderStudentAssignments();
    }
}

// Render assignments for teachers
function renderTeacherAssignments(filter = 'all') {
    AssignmentsState.currentFilter = filter;
    const assignmentList = document.getElementById('assignment-list');
    
    if (!assignmentList) return;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    if (!AssignmentsState.currentAssignments || AssignmentsState.currentAssignments.length === 0) {
        assignmentList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <p>No assignments created yet</p>
                <button class="btn btn-primary" onclick="createAssignment()">
                    Create Your First Assignment
                </button>
            </div>
        `;
        return;
    }
    
    // Filter assignments
    let filteredAssignments = AssignmentsState.currentAssignments;
    const now = new Date();
    
    switch(filter) {
        case 'active':
            filteredAssignments = AssignmentsState.currentAssignments.filter(a => 
                new Date(a.due_date) > now
            );
            break;
        case 'completed':
            filteredAssignments = AssignmentsState.currentAssignments.filter(a => 
                new Date(a.due_date) < now
            );
            break;
        case 'pending-grading':
            filteredAssignments = AssignmentsState.currentAssignments.filter(a => 
                a.submissions_aggregate?.aggregate?.count > 0 &&
                a.submissions_aggregate?.aggregate?.avg?.grade === null
            );
            break;
    }
    
    if (filteredAssignments.length === 0) {
        assignmentList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <p>No assignments match the selected filter</p>
            </div>
        `;
        return;
    }
    
    assignmentList.innerHTML = filteredAssignments.map(assignment => {
        const dueDate = new Date(assignment.due_date);
        const isOverdue = dueDate < now;
        const submissionCount = assignment.submissions?.[0]?.count || 0;
        const avgGrade = assignment.submissions_aggregate?.aggregate?.avg?.grade || 0;
        
        return `
            <div class="assignment-card" data-id="${assignment.id}">
                <div class="assignment-header">
                    <h4 class="assignment-title">${assignment.title}</h4>
                    <span class="assignment-course">${assignment.courses?.name || 'General'}</span>
                </div>
                
                <div class="assignment-details">
                    <div class="assignment-info">
                        <p class="assignment-description">${assignment.description || 'No description provided'}</p>
                        <div class="assignment-meta">
                            <span class="meta-item">
                                <i class="far fa-calendar"></i>
                                Due: ${formatDateTime(assignment.due_date)}
                            </span>
                            <span class="meta-item">
                                <i class="fas fa-star"></i>
                                ${assignment.max_points || 100} points
                            </span>
                        </div>
                    </div>
                    
                    <div class="assignment-stats">
                        <div class="stat">
                            <span class="stat-value">${submissionCount}</span>
                            <span class="stat-label">Submissions</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${avgGrade || '--'}</span>
                            <span class="stat-label">Avg Grade</span>
                        </div>
                        <div class="stat">
                            <span class="status-badge ${isOverdue ? 'status-overdue' : 'status-active'}">
                                ${isOverdue ? 'Overdue' : 'Active'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="assignment-actions">
                    <button class="btn btn-primary btn-sm" onclick="gradeAssignment('${assignment.id}')">
                        <i class="fas fa-check-circle"></i> Grade
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="viewAssignmentSubmissions('${assignment.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="editAssignment('${assignment.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Render assignments for students
function renderStudentAssignments(filter = 'all') {
    AssignmentsState.currentFilter = filter;
    const assignmentList = document.getElementById('assignment-list');
    
    if (!assignmentList) return;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    if (!AssignmentsState.currentAssignments || AssignmentsState.currentAssignments.length === 0) {
        assignmentList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <p>No assignments yet</p>
                <p class="small">Assignments will appear here when your teacher creates them</p>
            </div>
        `;
        return;
    }
    
    // Filter assignments
    let filteredAssignments = AssignmentsState.currentAssignments;
    const now = new Date();
    
    switch(filter) {
        case 'pending':
            filteredAssignments = AssignmentsState.currentAssignments.filter(a => {
                const dueDate = new Date(a.due_date);
                const submission = a.submissions?.[0];
                return dueDate > now && !submission?.submitted_at;
            });
            break;
        case 'submitted':
            filteredAssignments = AssignmentsState.currentAssignments.filter(a => 
                a.submissions?.[0]?.submitted_at
            );
            break;
        case 'graded':
            filteredAssignments = AssignmentsState.currentAssignments.filter(a => 
                a.submissions?.[0]?.grade !== null
            );
            break;
        case 'overdue':
            filteredAssignments = AssignmentsState.currentAssignments.filter(a => {
                const dueDate = new Date(a.due_date);
                const submission = a.submissions?.[0];
                return dueDate < now && !submission?.submitted_at;
            });
            break;
    }
    
    if (filteredAssignments.length === 0) {
        assignmentList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <p>No assignments match the selected filter</p>
            </div>
        `;
        return;
    }
    
    assignmentList.innerHTML = filteredAssignments.map(assignment => {
        const dueDate = new Date(assignment.due_date);
        const now = new Date();
        const submission = assignment.submissions?.[0];
        const isSubmitted = !!submission?.submitted_at;
        const isGraded = submission?.grade !== null;
        const isOverdue = dueDate < now && !isSubmitted;
        
        let status = 'pending';
        let statusClass = 'status-pending';
        let statusText = 'Pending';
        
        if (isGraded) {
            status = 'graded';
            statusClass = 'status-graded';
            statusText = 'Graded';
        } else if (isSubmitted) {
            status = 'submitted';
            statusClass = 'status-submitted';
            statusText = 'Submitted';
        } else if (isOverdue) {
            status = 'overdue';
            statusClass = 'status-overdue';
            statusText = 'Overdue';
        }
        
        return `
            <div class="assignment-card" data-id="${assignment.id}">
                <div class="assignment-header">
                    <h4 class="assignment-title">${assignment.title}</h4>
                    <span class="assignment-course">${assignment.courses?.name || 'General'}</span>
                </div>
                
                <div class="assignment-details">
                    <div class="assignment-info">
                        <p class="assignment-description">${assignment.description || 'No description provided'}</p>
                        <div class="assignment-meta">
                            <span class="meta-item">
                                <i class="far fa-calendar"></i>
                                Due: ${formatDateTime(assignment.due_date)}
                            </span>
                            <span class="meta-item">
                                <i class="fas fa-star"></i>
                                ${assignment.max_points || 100} points
                            </span>
                        </div>
                    </div>
                    
                    <div class="assignment-status">
                        <span class="status-badge ${statusClass}">
                            ${statusText}
                        </span>
                        ${isGraded ? `
                            <div class="grade-display">
                                <span class="grade-score">${submission.grade}/${assignment.max_points}</span>
                                <span class="grade-percentage">(${Math.round((submission.grade / assignment.max_points) * 100)}%)</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="assignment-actions">
                    ${!isSubmitted ? `
                        <button class="btn btn-primary btn-sm" onclick="submitAssignment('${assignment.id}')">
                            <i class="fas fa-paper-plane"></i> Submit
                        </button>
                    ` : ''}
                    
                    ${isGraded && submission.feedback ? `
                        <button class="btn btn-secondary btn-sm" onclick="viewAssignmentFeedback('${assignment.id}')">
                            <i class="fas fa-comment"></i> Feedback
                        </button>
                    ` : ''}
                    
                    <button class="btn btn-outline btn-sm" onclick="viewAssignmentDetails('${assignment.id}')">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Filter assignments
function filterAssignments(filter) {
    if (AppState.userRole === 'teacher') {
        renderTeacherAssignments(filter);
    } else {
        renderStudentAssignments(filter);
    }
}

// =====================
// ASSIGNMENT MANAGEMENT
// =====================

// Create new assignment
async function createAssignment() {
    if (AppState.userRole !== 'teacher') {
        showToast('Only teachers can create assignments', 'error');
        return;
    }
    
    try {
        // Load teacher's classes
        const { data: classes, error } = await window.supabase
            .from('courses')
            .select('id, name')
            .eq('teacher_id', AppState.currentUser.id)
            .eq('is_active', true)
            .order('name');
        
        if (error) throw error;
        
        if (!classes || classes.length === 0) {
            showToast('You need to create a class first', 'error');
            showSection('classroom');
            return;
        }
        
        // Create modal for assignment creation
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create New Assignment</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Title *</label>
                        <input type="text" id="assignment-title" class="form-control" 
                               placeholder="Enter assignment title" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="assignment-description" class="form-control" 
                                  rows="3" placeholder="Describe the assignment..."></textarea>
                    </div>
                    <div class="row">
                        <div class="col-6">
                            <div class="form-group">
                                <label>Due Date *</label>
                                <input type="datetime-local" id="assignment-due-date" 
                                       class="form-control" required>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="form-group">
                                <label>Max Points *</label>
                                <input type="number" id="assignment-points" class="form-control" 
                                       value="100" min="1" max="1000" required>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Class *</label>
                        <select id="assignment-class" class="form-control" required>
                            <option value="">Select a class</option>
                            ${classes.map(cls => `
                                <option value="${cls.id}">${cls.name}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveNewAssignment()">Create Assignment</button>
                </div>
            </div>
        `;
        
        showModal(modalContent);
        
        // Set default due date (tomorrow at 11:59 PM)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 0);
        
        const dueDateInput = document.getElementById('assignment-due-date');
        if (dueDateInput) {
            dueDateInput.value = tomorrow.toISOString().slice(0, 16);
        }
        
    } catch (error) {
        console.error('Error loading classes for assignment:', error);
        showToast('Error loading classes', 'error');
    }
}

// Save new assignment
async function saveNewAssignment() {
    const title = document.getElementById('assignment-title')?.value;
    const description = document.getElementById('assignment-description')?.value;
    const dueDate = document.getElementById('assignment-due-date')?.value;
    const points = document.getElementById('assignment-points')?.value;
    const classId = document.getElementById('assignment-class')?.value;
    
    // Validation
    if (!title || !dueDate || !points || !classId) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    try {
        const { data, error } = await window.supabase
            .from('assignments')
            .insert([{
                title: title.trim(),
                description: description?.trim() || null,
                due_date: dueDate,
                max_points: parseInt(points),
                course_id: classId,
                created_by: AppState.currentUser.id,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('Assignment created successfully!', 'success');
        closeModal();
        
        // Reload assignments
        await loadAssignmentsSection();
        
    } catch (error) {
        console.error('Error creating assignment:', error);
        showToast('Error creating assignment: ' + error.message, 'error');
    }
}

// Submit assignment
async function submitAssignment(assignmentId) {
    try {
        const assignment = AssignmentsState.currentAssignments.find(a => a.id === assignmentId);
        if (!assignment) {
            showToast('Assignment not found', 'error');
            return;
        }
        
        const dueDate = new Date(assignment.due_date);
        if (dueDate < new Date()) {
            showToast('This assignment is overdue and cannot be submitted', 'error');
            return;
        }
        
        const submissionContent = prompt('Enter your submission (text or paste a link):');
        if (!submissionContent) return;
        
        const { data, error } = await window.supabase
            .from('submissions')
            .insert([{
                assignment_id: assignmentId,
                student_id: AppState.currentUser.id,
                content: submissionContent.trim(),
                submitted_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('Assignment submitted successfully!', 'success');
        
        // Reload assignments
        await loadAssignmentsSection();
        
    } catch (error) {
        console.error('Error submitting assignment:', error);
        showToast('Error submitting assignment: ' + error.message, 'error');
    }
}

// Grade assignment
async function gradeAssignment(assignmentId) {
    try {
        // Load assignment details
        const { data: assignment, error: assignError } = await window.supabase
            .from('assignments')
            .select('*')
            .eq('id', assignmentId)
            .single();
        
        if (assignError) throw assignError;
        
        // Load submissions for this assignment
        const { data: submissions, error: subError } = await window.supabase
            .from('submissions')
            .select(`
                *,
                student:user_profiles(full_name, email)
            `)
            .eq('assignment_id', assignmentId)
            .order('submitted_at', { ascending: true });
        
        if (subError) throw subError;
        
        if (!submissions || submissions.length === 0) {
            showToast('No submissions to grade yet', 'info');
            return;
        }
        
        // Create grading modal
        const modalContent = `
            <div class="modal-content wide-modal">
                <div class="modal-header">
                    <h3>Grade Submissions: ${assignment.title}</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="grading-header">
                        <div class="assignment-info">
                            <p><strong>Points:</strong> ${assignment.max_points}</p>
                            <p><strong>Due:</strong> ${formatDateTime(assignment.due_date)}</p>
                        </div>
                    </div>
                    
                    <div class="submissions-list">
                        ${submissions.map((sub, index) => `
                            <div class="submission-item" data-id="${sub.id}">
                                <div class="submission-header">
                                    <h4>${sub.student?.full_name || sub.student?.email || 'Student'}</h4>
                                    <span class="submission-time">
                                        Submitted: ${formatDateTime(sub.submitted_at)}
                                    </span>
                                </div>
                                <div class="submission-content">
                                    <p>${sub.content || 'No content'}</p>
                                </div>
                                <div class="grading-section">
                                    <div class="grade-input-group">
                                        <label>Grade (out of ${assignment.max_points}):</label>
                                        <input type="number" id="grade-${sub.id}" 
                                               class="grade-input" 
                                               value="${sub.grade || ''}" 
                                               min="0" max="${assignment.max_points}"
                                               placeholder="Enter grade">
                                    </div>
                                    <div class="feedback-input-group">
                                        <label>Feedback:</label>
                                        <textarea id="feedback-${sub.id}" 
                                                  class="feedback-input" 
                                                  rows="3" 
                                                  placeholder="Enter feedback...">${sub.feedback || ''}</textarea>
                                    </div>
                                    <button class="btn btn-primary btn-sm" 
                                            onclick="saveGrade('${sub.id}', '${assignmentId}')">
                                        Save Grade
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        `;
        
        showModal(modalContent);
        
    } catch (error) {
        console.error('Error loading submissions for grading:', error);
        showToast('Error loading submissions', 'error');
    }
}

// Save grade
async function saveGrade(submissionId, assignmentId) {
    const gradeInput = document.getElementById(`grade-${submissionId}`);
    const feedbackInput = document.getElementById(`feedback-${submissionId}`);
    
    if (!gradeInput || !feedbackInput) return;
    
    const grade = gradeInput.value ? parseInt(gradeInput.value) : null;
    const feedback = feedbackInput.value.trim();
    
    try {
        const { error } = await window.supabase
            .from('submissions')
            .update({
                grade: grade,
                feedback: feedback,
                graded_at: new Date().toISOString()
            })
            .eq('id', submissionId);
        
        if (error) throw error;
        
        showToast('Grade saved successfully!', 'success');
        
        // Update the UI
        const saveBtn = gradeInput.closest('.submission-item').querySelector('button');
        saveBtn.textContent = 'Saved ✓';
        saveBtn.disabled = true;
        setTimeout(() => {
            saveBtn.textContent = 'Save Grade';
            saveBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Error saving grade:', error);
        showToast('Error saving grade: ' + error.message, 'error');
    }
}

// =====================
// GRADES SECTION
// =====================

// Load grades section
async function loadGradesSection() {
    console.log('📊 Loading grades section for:', AppState.userRole);
    
    try {
        if (AppState.userRole === 'teacher') {
            await loadTeacherGrades();
        } else {
            await loadStudentGrades();
        }
        
    } catch (error) {
        console.error('❌ Error loading grades section:', error);
        showToast('Error loading grades', 'error');
    }
}

// Load student grades
async function loadStudentGrades() {
    try {
        // Get all submissions with assignment details
        const { data: submissions, error } = await window.supabase
            .from('submissions')
            .select(`
                *,
                assignment:assignments(
                    title,
                    max_points,
                    due_date,
                    courses(name)
                )
            `)
            .eq('student_id', AppState.currentUser.id)
            .order('submitted_at', { ascending: false });
        
        if (error) throw error;
        
        // Calculate statistics
        let totalScore = 0;
        let gradedCount = 0;
        let totalPossible = 0;
        
        const gradesTable = document.getElementById('grades-table');
        if (gradesTable) {
            if (submissions && submissions.length > 0) {
                const tableRows = submissions.map(sub => {
                    const assignment = sub.assignment;
                    const grade = sub.grade;
                    const maxPoints = assignment?.max_points || 100;
                    
                    if (grade !== null) {
                        totalScore += grade;
                        gradedCount++;
                        totalPossible += maxPoints;
                    }
                    
                    const percentage = grade !== null ? (grade / maxPoints * 100) : 0;
                    const letterGrade = getLetterGrade(percentage);
                    
                    return `
                        <tr>
                            <td>${assignment?.title || 'Unknown'}</td>
                            <td>${assignment?.courses?.name || 'General'}</td>
                            <td>${assignment?.due_date ? formatDateTime(assignment.due_date) : '--'}</td>
                            <td>${grade !== null ? `${grade}/${maxPoints}` : '--'}</td>
                            <td>${letterGrade}</td>
                            <td>${sub.graded_at ? formatDateTime(sub.graded_at) : '--'}</td>
                            <td>
                                ${sub.feedback ? 
                                    `<button class="btn-link" onclick="viewFeedbackModal('${sub.id}')">View</button>` : 
                                    '--'
                                }
                            </td>
                        </tr>
                    `;
                }).join('');
                
                gradesTable.innerHTML = tableRows;
            } else {
                gradesTable.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">
                            <div class="empty-state">
                                <i class="fas fa-clipboard-check"></i>
                                <p>No grades available yet</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
        
        // Update statistics
        const averageGrade = gradedCount > 0 ? Math.round(totalScore / totalPossible * 100) : 0;
        const overallLetterGrade = getLetterGrade(averageGrade);
        
        updateGradeStatistics({
            averageGrade: averageGrade,
            letterGrade: overallLetterGrade,
            gradedCount: gradedCount,
            totalAssignments: submissions?.length || 0
        });
        
    } catch (error) {
        console.error('Error loading student grades:', error);
        showToast('Error loading grades', 'error');
    }
}

// Load teacher grades
async function loadTeacherGrades() {
    try {
        // Get all assignments created by teacher
        const { data: assignments, error } = await window.supabase
            .from('assignments')
            .select(`
                *,
                courses(name),
                submissions(
                    id,
                    grade,
                    feedback,
                    graded_at
                )
            `)
            .eq('created_by', AppState.currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Calculate statistics
        let totalSubmissions = 0;
        let gradedSubmissions = 0;
        let averageGrade = 0;
        
        assignments?.forEach(assignment => {
            if (assignment.submissions) {
                totalSubmissions += assignment.submissions.length;
                assignment.submissions.forEach(sub => {
                    if (sub.grade !== null) {
                        gradedSubmissions++;
                        averageGrade += sub.grade;
                    }
                });
            }
        });
        
        // Render assignments with grading status
        const gradesTable = document.getElementById('grades-table');
        if (gradesTable) {
            if (assignments && assignments.length > 0) {
                const tableRows = assignments.map(assignment => {
                    const submissions = assignment.submissions || [];
                    const gradedCount = submissions.filter(s => s.grade !== null).length;
                    const totalCount = submissions.length;
                    const gradingProgress = totalCount > 0 ? Math.round((gradedCount / totalCount) * 100) : 0;
                    
                    return `
                        <tr>
                            <td>${assignment.title}</td>
                            <td>${assignment.courses?.name || 'General'}</td>
                            <td>${formatDateTime(assignment.due_date)}</td>
                            <td>${assignment.max_points}</td>
                            <td>${totalCount}</td>
                            <td>${gradedCount}</td>
                            <td>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${gradingProgress}%"></div>
                                    <span class="progress-text">${gradingProgress}%</span>
                                </div>
                            </td>
                            <td>
                                <button class="btn btn-primary btn-sm" onclick="gradeAssignment('${assignment.id}')">
                                    Grade
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');
                
                gradesTable.innerHTML = tableRows;
            } else {
                gradesTable.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center">
                            <div class="empty-state">
                                <i class="fas fa-clipboard-check"></i>
                                <p>No assignments created yet</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
        
        // Update statistics for teacher
        updateGradeStatistics({
            averageGrade: gradedSubmissions > 0 ? Math.round(averageGrade / gradedSubmissions) : 0,
            totalSubmissions: totalSubmissions,
            gradedSubmissions: gradedSubmissions,
            gradingProgress: totalSubmissions > 0 ? Math.round((gradedSubmissions / totalSubmissions) * 100) : 0
        });
        
    } catch (error) {
        console.error('Error loading teacher grades:', error);
        showToast('Error loading grades', 'error');
    }
}

// Update grade statistics
function updateGradeStatistics(stats) {
    // Update overall grade
    const overallGradeEl = document.getElementById('overall-grade');
    if (overallGradeEl) {
        overallGradeEl.textContent = stats.letterGrade || '--';
    }
    
    // Update average score
    const averageScoreEl = document.getElementById('average-score');
    if (averageScoreEl) {
        averageScoreEl.textContent = `${stats.averageGrade || 0}%`;
    }
    
    // Update graded assignments
    const gradedCountEl = document.getElementById('graded-count');
    if (gradedCountEl) {
        const total = stats.totalAssignments || stats.totalSubmissions || 0;
        const graded = stats.gradedCount || stats.gradedSubmissions || 0;
        gradedCountEl.textContent = `${graded}/${total}`;
    }
    
    // Update grading progress (for teachers)
    const gradingProgressEl = document.getElementById('grading-progress');
    if (gradingProgressEl && stats.gradingProgress !== undefined) {
        gradingProgressEl.textContent = `${stats.gradingProgress}%`;
        const progressBar = gradingProgressEl.closest('.progress-bar');
        if (progressBar) {
            const fill = progressBar.querySelector('.progress-fill');
            if (fill) {
                fill.style.width = `${stats.gradingProgress}%`;
            }
        }
    }
}

// =====================
// UTILITY FUNCTIONS
// =====================

// Get letter grade from percentage
function getLetterGrade(percentage) {
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
}

// Export grades
async function exportGrades() {
    try {
        if (AppState.userRole === 'student') {
            await exportStudentGrades();
        } else {
            await exportTeacherGrades();
        }
    } catch (error) {
        console.error('Error exporting grades:', error);
        showToast('Error exporting grades', 'error');
    }
}

// Export student grades
async function exportStudentGrades() {
    try {
        const { data: submissions, error } = await window.supabase
            .from('submissions')
            .select(`
                *,
                assignment:assignments(
                    title,
                    max_points,
                    due_date,
                    courses(name)
                )
            `)
            .eq('student_id', AppState.currentUser.id);
        
        if (error) throw error;
        
        let csvContent = "Assignment,Class,Due Date,Score,Percentage,Letter Grade,Feedback\n";
        
        if (submissions && submissions.length > 0) {
            submissions.forEach(sub => {
                const assignment = sub.assignment;
                const grade = sub.grade;
                const maxPoints = assignment?.max_points || 100;
                const percentage = grade !== null ? (grade / maxPoints * 100).toFixed(1) : '';
                const letterGrade = grade !== null ? getLetterGrade(percentage) : '';
                
                csvContent += `"${assignment?.title || ''}","${assignment?.courses?.name || ''}",`;
                csvContent += `"${assignment?.due_date ? formatDateTime(assignment.due_date) : ''}",`;
                csvContent += `${grade !== null ? `${grade}/${maxPoints}` : ''},`;
                csvContent += `${percentage},`;
                csvContent += `${letterGrade},"${sub.feedback || ''}"\n`;
            });
        }
        
        // Create and trigger download
        downloadCSV(csvContent, `grades_${AppState.currentUser.email}_${new Date().toISOString().split('T')[0]}.csv`);
        
        showToast('Grades exported successfully!', 'success');
        
    } catch (error) {
        console.error('Error exporting student grades:', error);
        showToast('Error exporting grades', 'error');
    }
}

// Export teacher grades
async function exportTeacherGrades() {
    try {
        // Get all assignments with submissions
        const { data: assignments, error } = await window.supabase
            .from('assignments')
            .select(`
                *,
                courses(name),
                submissions(
                    *,
                    student:user_profiles(full_name, email)
                )
            `)
            .eq('created_by', AppState.currentUser.id);
        
        if (error) throw error;
        
        let csvContent = "Student,Email,Assignment,Class,Due Date,Score,Percentage,Letter Grade,Feedback\n";
        
        if (assignments && assignments.length > 0) {
            assignments.forEach(assignment => {
                const submissions = assignment.submissions || [];
                submissions.forEach(sub => {
                    const grade = sub.grade;
                    const maxPoints = assignment.max_points || 100;
                    const percentage = grade !== null ? (grade / maxPoints * 100).toFixed(1) : '';
                    const letterGrade = grade !== null ? getLetterGrade(percentage) : '';
                    
                    csvContent += `"${sub.student?.full_name || ''}","${sub.student?.email || ''}",`;
                    csvContent += `"${assignment.title}","${assignment.courses?.name || ''}",`;
                    csvContent += `"${formatDateTime(assignment.due_date)}",`;
                    csvContent += `${grade !== null ? `${grade}/${maxPoints}` : ''},`;
                    csvContent += `${percentage},`;
                    csvContent += `${letterGrade},"${sub.feedback || ''}"\n`;
                });
            });
        }
        
        // Create and trigger download
        downloadCSV(csvContent, `grades_report_${new Date().toISOString().split('T')[0]}.csv`);
        
        showToast('Grades report exported successfully!', 'success');
        
    } catch (error) {
        console.error('Error exporting teacher grades:', error);
        showToast('Error exporting grades report', 'error');
    }
}

// Download CSV file
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// View feedback modal
async function viewFeedbackModal(submissionId) {
    try {
        const { data: submission, error } = await window.supabase
            .from('submissions')
            .select(`
                *,
                assignment:assignments(title)
            `)
            .eq('id', submissionId)
            .single();
        
        if (error) throw error;
        
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Feedback: ${submission.assignment?.title}</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="feedback-display">
                        ${submission.grade !== null ? `
                            <div class="grade-display">
                                <h4>Grade: ${submission.grade}</h4>
                            </div>
                        ` : ''}
                        ${submission.feedback ? `
                            <div class="feedback-content">
                                <h5>Teacher's Feedback:</h5>
                                <div class="feedback-text">
                                    ${submission.feedback}
                                </div>
                            </div>
                        ` : '<p>No feedback provided.</p>'}
                    </div>
                </div>
            </div>
        `;
        
        showModal(modalContent);
        
    } catch (error) {
        console.error('Error loading feedback:', error);
        showToast('Error loading feedback', 'error');
    }
}

// Modal helper functions
function showModal(content) {
    // Check if modal container exists
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'modal-container';
        modalContainer.className = 'modal-container';
        document.body.appendChild(modalContainer);
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = content;
    
    // Clear and add new modal
    modalContainer.innerHTML = '';
    modalContainer.appendChild(modal);
    
    // Show with animation
    setTimeout(() => {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }, 10);
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            const container = document.getElementById('modal-container');
            if (container) {
                container.innerHTML = '';
            }
            document.body.style.overflow = '';
        }, 300);
    }
}

// Format date time (needs to be defined or imported)
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
// MODULE EXPORTS
// =====================

// Export module functions
window.initAssignments = initAssignments;
window.loadAssignmentsSection = loadAssignmentsSection;
window.loadGradesSection = loadGradesSection;
window.createAssignment = createAssignment;
window.submitAssignment = submitAssignment;
window.gradeAssignment = gradeAssignment;
window.filterAssignments = filterAssignments;
window.exportGrades = exportGrades;
window.viewFeedbackModal = viewFeedbackModal;

console.log('✅ assignments.js loaded - Assignments module ready');
