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
    
    // Setup modal event listeners
    setupModalListeners();
}

// Setup modal event listeners
function setupModalListeners() {
    // Close modal when clicking outside content
    document.addEventListener('click', function(event) {
        const modal = event.target.closest('.modal');
        if (modal && event.target === modal) {
            closeModal(modal.id);
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const visibleModal = document.querySelector('.modal:not(.hidden)');
            if (visibleModal) {
                closeModal(visibleModal.id);
            }
        }
    });
}

// Setup assignments event listeners
function setupAssignmentsListeners() {
    console.log('Setting up assignment listeners...');
    
    // Use event delegation for filter buttons
    document.addEventListener('click', function(event) {
        const filterBtn = event.target.closest('.filter-btn');
        if (filterBtn) {
            const filter = filterBtn.dataset.filter || filterBtn.textContent.toLowerCase();
            filterAssignments(filter);
        }
    });
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
        const isTeachingRole = AppState.userRole === 'lecturer' || 
                               AppState.userRole === 'admin' || 
                               AppState.userRole === 'superadmin';
        
        if (isTeachingRole) {
            await loadLecturerAssignments();
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

// Load assignments for lecturers
async function loadLecturerAssignments() {
    try {
        const { data, error } = await window.supabase
            .from('assignments')
            .select(`
                *,
                courses(course_name),
                submissions(count)
            `)
            .eq('created_by', AppState.currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        AssignmentsState.currentAssignments = data || [];
        renderLecturerAssignments();
        
    } catch (error) {
        console.error('Error loading lecturer assignments:', error);
        AssignmentsState.currentAssignments = [];
        renderLecturerAssignments();
    }
}

// Load assignments for students
async function loadStudentAssignments() {
    try {
        // First get enrolled courses
        const { data: enrollments, error: enrollError } = await window.supabase
            .from('enrollments')
            .select('course_id')
            .eq('user_id', AppState.currentUser.id);
        
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
                courses(course_name),
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

// Render assignments for lecturers
function renderLecturerAssignments(filter = 'all') {
    AssignmentsState.currentFilter = filter;
    const assignmentList = document.getElementById('assignment-list');
    
    if (!assignmentList) return;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter || btn.textContent.toLowerCase().includes(filter)) {
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
                <button class="btn btn-primary" onclick="createAssignmentModal()">
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
                a.submissions && a.submissions.length > 0 && 
                a.submissions.every(s => s.grade === null)
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
        
        return `
            <div class="assignment-card" data-id="${assignment.id}">
                <div class="assignment-header">
                    <h4 class="assignment-title">${assignment.title}</h4>
                    <span class="assignment-course">${assignment.courses?.course_name || 'General'}</span>
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
        if (btn.dataset.filter === filter || btn.textContent.toLowerCase().includes(filter)) {
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
                <p class="small">Assignments will appear here when your lecturer creates them</p>
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
                    <span class="assignment-course">${assignment.courses?.course_name || 'General'}</span>
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
    const isTeachingRole = AppState.userRole === 'lecturer' || 
                           AppState.userRole === 'admin' || 
                           AppState.userRole === 'superadmin';
    
    if (isTeachingRole) {
        renderLecturerAssignments(filter);
    } else {
        renderStudentAssignments(filter);
    }
}

// =====================
// ASSIGNMENT MANAGEMENT
// =====================

// Show create assignment modal
async function createAssignmentModal() {
    try {
        // Get courses taught by lecturer
        const { data: courses, error } = await window.supabase
            .from('courses')
            .select('id, course_name')
            .eq('created_by', AppState.currentUser.id);
        
        if (error) throw error;
        
        const courseOptions = courses && courses.length > 0 
            ? courses.map(course => `<option value="${course.id}">${course.course_name}</option>`).join('')
            : '<option value="">No courses available</option>';
        
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create New Assignment</h3>
                    <button class="modal-close" onclick="closeModal('create-assignment-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="createAssignmentForm" onsubmit="createAssignment(event)">
                        <div class="form-group">
                            <label for="assignment-title">Assignment Title</label>
                            <input type="text" id="assignment-title" required 
                                   placeholder="Enter assignment title">
                        </div>
                        
                        <div class="form-group">
                            <label for="assignment-course">Course</label>
                            <select id="assignment-course" required>
                                <option value="">Select a course</option>
                                ${courseOptions}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="assignment-description">Description</label>
                            <textarea id="assignment-description" rows="4" 
                                      placeholder="Enter assignment description..."></textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="assignment-points">Maximum Points</label>
                                <input type="number" id="assignment-points" 
                                       value="100" min="1" max="1000" required>
                            </div>
                            <div class="form-group">
                                <label for="assignment-due-date">Due Date</label>
                                <input type="datetime-local" id="assignment-due-date" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="assignment-instructions">Instructions (Optional)</label>
                            <textarea id="assignment-instructions" rows="3" 
                                      placeholder="Add any specific instructions for students..."></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('create-assignment-modal')">Cancel</button>
                    <button type="submit" form="createAssignmentForm" class="btn btn-primary">Create Assignment</button>
                </div>
            </div>
        `;
        
        createDynamicModal('create-assignment-modal', modalContent);
        showModal('create-assignment-modal');
        
        // Set default due date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('assignment-due-date').value = tomorrow.toISOString().slice(0, 16);
        
    } catch (error) {
        console.error('Error loading create assignment modal:', error);
        showToast('Error loading form', 'error');
    }
}

// Create new assignment
async function createAssignment(event) {
    event.preventDefault();
    
    try {
        const title = document.getElementById('assignment-title').value.trim();
        const courseId = document.getElementById('assignment-course').value;
        const description = document.getElementById('assignment-description').value.trim();
        const maxPoints = parseInt(document.getElementById('assignment-points').value);
        const dueDate = document.getElementById('assignment-due-date').value;
        const instructions = document.getElementById('assignment-instructions').value.trim();
        
        if (!title || !courseId || !dueDate) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const { data, error } = await window.supabase
            .from('assignments')
            .insert([{
                title: title,
                course_id: courseId,
                description: description || null,
                max_points: maxPoints,
                due_date: dueDate,
                instructions: instructions || null,
                created_by: AppState.currentUser.id
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('Assignment created successfully!', 'success');
        closeModal('create-assignment-modal');
        
        // Reload assignments
        await loadAssignmentsSection();
        
    } catch (error) {
        console.error('Error creating assignment:', error);
        showToast('Error creating assignment: ' + error.message, 'error');
    }
}

// Edit assignment
async function editAssignment(assignmentId) {
    try {
        // Get assignment details
        const { data: assignment, error: assignError } = await window.supabase
            .from('assignments')
            .select('*')
            .eq('id', assignmentId)
            .single();
        
        if (assignError) throw assignError;
        
        // Get courses taught by lecturer
        const { data: courses, error: courseError } = await window.supabase
            .from('courses')
            .select('id, course_name')
            .eq('created_by', AppState.currentUser.id);
        
        if (courseError) throw courseError;
        
        const courseOptions = courses && courses.length > 0 
            ? courses.map(course => 
                `<option value="${course.id}" ${course.id === assignment.course_id ? 'selected' : ''}>${course.course_name}</option>`
              ).join('')
            : '<option value="">No courses available</option>';
        
        // Format due date for datetime-local input
        const dueDate = new Date(assignment.due_date);
        const formattedDueDate = dueDate.toISOString().slice(0, 16);
        
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Assignment</h3>
                    <button class="modal-close" onclick="closeModal('edit-assignment-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editAssignmentForm" onsubmit="updateAssignment(event, '${assignmentId}')">
                        <div class="form-group">
                            <label for="edit-assignment-title">Assignment Title</label>
                            <input type="text" id="edit-assignment-title" required 
                                   value="${assignment.title}" 
                                   placeholder="Enter assignment title">
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-assignment-course">Course</label>
                            <select id="edit-assignment-course" required>
                                <option value="">Select a course</option>
                                ${courseOptions}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-assignment-description">Description</label>
                            <textarea id="edit-assignment-description" rows="4" 
                                      placeholder="Enter assignment description...">${assignment.description || ''}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-assignment-points">Maximum Points</label>
                                <input type="number" id="edit-assignment-points" 
                                       value="${assignment.max_points || 100}" 
                                       min="1" max="1000" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-assignment-due-date">Due Date</label>
                                <input type="datetime-local" id="edit-assignment-due-date" 
                                       value="${formattedDueDate}" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-assignment-instructions">Instructions (Optional)</label>
                            <textarea id="edit-assignment-instructions" rows="3" 
                                      placeholder="Add any specific instructions for students...">${assignment.instructions || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-danger" onclick="deleteAssignment('${assignmentId}')">Delete</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('edit-assignment-modal')">Cancel</button>
                    <button type="submit" form="editAssignmentForm" class="btn btn-primary">Update Assignment</button>
                </div>
            </div>
        `;
        
        createDynamicModal('edit-assignment-modal', modalContent);
        showModal('edit-assignment-modal');
        
    } catch (error) {
        console.error('Error loading edit assignment modal:', error);
        showToast('Error loading assignment details', 'error');
    }
}

// Update assignment
async function updateAssignment(event, assignmentId) {
    event.preventDefault();
    
    try {
        const title = document.getElementById('edit-assignment-title').value.trim();
        const courseId = document.getElementById('edit-assignment-course').value;
        const description = document.getElementById('edit-assignment-description').value.trim();
        const maxPoints = parseInt(document.getElementById('edit-assignment-points').value);
        const dueDate = document.getElementById('edit-assignment-due-date').value;
        const instructions = document.getElementById('edit-assignment-instructions').value.trim();
        
        if (!title || !courseId || !dueDate) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const { error } = await window.supabase
            .from('assignments')
            .update({
                title: title,
                course_id: courseId,
                description: description || null,
                max_points: maxPoints,
                due_date: dueDate,
                instructions: instructions || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', assignmentId);
        
        if (error) throw error;
        
        showToast('Assignment updated successfully!', 'success');
        closeModal('edit-assignment-modal');
        
        // Reload assignments
        await loadAssignmentsSection();
        
    } catch (error) {
        console.error('Error updating assignment:', error);
        showToast('Error updating assignment: ' + error.message, 'error');
    }
}

// Delete assignment
async function deleteAssignment(assignmentId) {
    if (!confirm('Are you sure you want to delete this assignment? This will also delete all submissions.')) {
        return;
    }
    
    try {
        const { error } = await window.supabase
            .from('assignments')
            .delete()
            .eq('id', assignmentId);
        
        if (error) throw error;
        
        showToast('Assignment deleted successfully!', 'success');
        closeModal('edit-assignment-modal');
        
        // Reload assignments
        await loadAssignmentsSection();
        
    } catch (error) {
        console.error('Error deleting assignment:', error);
        showToast('Error deleting assignment: ' + error.message, 'error');
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
        
        // Check if already submitted
        const existingSubmission = assignment.submissions?.[0];
        if (existingSubmission?.submitted_at) {
            if (!confirm('You have already submitted this assignment. Do you want to submit again?')) {
                return;
            }
        }
        
        // Create submission modal
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Submit Assignment: ${assignment.title}</h3>
                    <button class="modal-close" onclick="closeModal('submit-assignment-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="assignment-info">
                        <p><strong>Due:</strong> ${formatDateTime(assignment.due_date)}</p>
                        <p><strong>Points:</strong> ${assignment.max_points || 100}</p>
                        ${assignment.description ? `<p>${assignment.description}</p>` : ''}
                        ${assignment.instructions ? `<div class="instructions"><strong>Instructions:</strong><p>${assignment.instructions}</p></div>` : ''}
                    </div>
                    
                    <form id="submitAssignmentForm" onsubmit="processSubmission(event, '${assignmentId}')">
                        <div class="form-group">
                            <label for="submission-content">Your Submission</label>
                            <textarea id="submission-content" rows="6" required 
                                      placeholder="Enter your submission here. You can paste text, code, or links to external files...">${existingSubmission?.content || ''}</textarea>
                            <p class="form-help">You can submit text, code, or links to Google Drive, GitHub, etc.</p>
                        </div>
                        
                        <div class="form-group">
                            <label for="submission-notes">Notes (Optional)</label>
                            <textarea id="submission-notes" rows="2" 
                                      placeholder="Any additional notes for the instructor...">${existingSubmission?.notes || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('submit-assignment-modal')">Cancel</button>
                    <button type="submit" form="submitAssignmentForm" class="btn btn-primary">Submit Assignment</button>
                </div>
            </div>
        `;
        
        createDynamicModal('submit-assignment-modal', modalContent);
        showModal('submit-assignment-modal');
        
    } catch (error) {
        console.error('Error preparing submission:', error);
        showToast('Error loading submission form', 'error');
    }
}

// Process submission
async function processSubmission(event, assignmentId) {
    event.preventDefault();
    
    try {
        const content = document.getElementById('submission-content').value.trim();
        const notes = document.getElementById('submission-notes').value.trim();
        
        if (!content) {
            showToast('Please enter your submission content', 'error');
            return;
        }
        
        // Check if assignment exists and is not overdue
        const assignment = AssignmentsState.currentAssignments.find(a => a.id === assignmentId);
        if (!assignment) {
            showToast('Assignment not found', 'error');
            return;
        }
        
        const dueDate = new Date(assignment.due_date);
        if (dueDate < new Date()) {
            showToast('This assignment is overdue and cannot be submitted', 'error');
            closeModal('submit-assignment-modal');
            return;
        }
        
        // Check if already submitted
        const existingSubmission = assignment.submissions?.[0];
        
        let result;
        if (existingSubmission?.id) {
            // Update existing submission
            const { data, error } = await window.supabase
                .from('submissions')
                .update({
                    content: content,
                    notes: notes || null,
                    submitted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingSubmission.id)
                .select()
                .single();
            
            if (error) throw error;
            result = data;
        } else {
            // Create new submission
            const { data, error } = await window.supabase
                .from('submissions')
                .insert([{
                    assignment_id: assignmentId,
                    student_id: AppState.currentUser.id,
                    content: content,
                    notes: notes || null,
                    submitted_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (error) throw error;
            result = data;
        }
        
        showToast('Assignment submitted successfully!', 'success');
        closeModal('submit-assignment-modal');
        
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
                student:consolidated_user_profiles_table(full_name, email)
            `)
            .eq('assignment_id', assignmentId)
            .order('submitted_at', { ascending: true });
        
        if (subError) throw subError;
        
        if (!submissions || submissions.length === 0) {
            showToast('No submissions to grade yet', 'info');
            return;
        }
        
        // Create grading modal content
        const modalContent = `
            <div class="modal-content wide-modal">
                <div class="modal-header">
                    <h3>Grade Submissions: ${assignment.title}</h3>
                    <button class="modal-close" onclick="closeModal('grading-modal')">&times;</button>
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
                                    ${sub.notes ? `<p class="submission-notes"><strong>Notes:</strong> ${sub.notes}</p>` : ''}
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
                    <button class="btn btn-secondary" onclick="closeModal('grading-modal')">Close</button>
                    <button class="btn btn-primary" onclick="gradeAllAndClose('${assignmentId}')">Save All & Close</button>
                </div>
            </div>
        `;
        
        // Create dynamic modal
        createDynamicModal('grading-modal', modalContent);
        showModal('grading-modal');
        
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
                graded_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', submissionId);
        
        if (error) throw error;
        
        // Update the UI
        const saveBtn = gradeInput.closest('.submission-item').querySelector('button');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved ✓';
        saveBtn.disabled = true;
        
        // Show toast only if grade was actually saved (not just feedback)
        if (grade !== null) {
            showToast('Grade saved successfully!', 'success');
        } else if (feedback) {
            showToast('Feedback saved!', 'success');
        }
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Error saving grade:', error);
        showToast('Error saving grade: ' + error.message, 'error');
    }
}

// Grade all and close
async function gradeAllAndClose(assignmentId) {
    try {
        // Get all submission items in the modal
        const submissionItems = document.querySelectorAll('.submission-item');
        let savedCount = 0;
        
        for (const item of submissionItems) {
            const submissionId = item.dataset.id;
            const gradeInput = document.getElementById(`grade-${submissionId}`);
            const feedbackInput = document.getElementById(`feedback-${submissionId}`);
            
            if (!gradeInput || !feedbackInput) continue;
            
            const grade = gradeInput.value ? parseInt(gradeInput.value) : null;
            const feedback = feedbackInput.value.trim();
            
            // Only save if there's a grade or feedback
            if (grade !== null || feedback) {
                const { error } = await window.supabase
                    .from('submissions')
                    .update({
                        grade: grade,
                        feedback: feedback,
                        graded_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', submissionId);
                
                if (!error) {
                    savedCount++;
                }
            }
        }
        
        showToast(`Saved grades for ${savedCount} submissions`, 'success');
        closeModal('grading-modal');
        
        // Reload assignments to reflect changes
        await loadAssignmentsSection();
        
    } catch (error) {
        console.error('Error saving all grades:', error);
        showToast('Error saving grades: ' + error.message, 'error');
    }
}

// View assignment submissions
async function viewAssignmentSubmissions(assignmentId) {
    try {
        // Load assignment details
        const { data: assignment, error: assignError } = await window.supabase
            .from('assignments')
            .select('*, courses(course_name)')
            .eq('id', assignmentId)
            .single();
        
        if (assignError) throw assignError;
        
        // Load submissions for this assignment
        const { data: submissions, error: subError } = await window.supabase
            .from('submissions')
            .select(`
                *,
                student:consolidated_user_profiles_table(full_name, email)
            `)
            .eq('assignment_id', assignmentId)
            .order('submitted_at', { ascending: true });
        
        if (subError) throw subError;
        
        const submissionsCount = submissions?.length || 0;
        const gradedCount = submissions?.filter(s => s.grade !== null).length || 0;
        
        const modalContent = `
            <div class="modal-content wide-modal">
                <div class="modal-header">
                    <h3>Submissions: ${assignment.title}</h3>
                    <button class="modal-close" onclick="closeModal('submissions-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="assignment-overview">
                        <div class="overview-stats">
                            <div class="stat">
                                <span class="stat-value">${submissionsCount}</span>
                                <span class="stat-label">Submissions</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">${gradedCount}</span>
                                <span class="stat-label">Graded</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">${assignment.max_points}</span>
                                <span class="stat-label">Max Points</span>
                            </div>
                        </div>
                        <div class="course-info">
                            <p><strong>Course:</strong> ${assignment.courses?.course_name || 'General'}</p>
                            <p><strong>Due:</strong> ${formatDateTime(assignment.due_date)}</p>
                        </div>
                    </div>
                    
                    ${submissions && submissions.length > 0 ? `
                        <div class="submissions-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Submitted</th>
                                        <th>Grade</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${submissions.map(sub => {
                                        const isGraded = sub.grade !== null;
                                        const percentage = isGraded ? Math.round((sub.grade / assignment.max_points) * 100) : 0;
                                        const letterGrade = isGraded ? getLetterGrade(percentage) : '--';
                                        
                                        return `
                                            <tr>
                                                <td>${sub.student?.full_name || sub.student?.email || 'Student'}</td>
                                                <td>${formatDateTime(sub.submitted_at)}</td>
                                                <td>
                                                    ${isGraded ? `
                                                        <div class="grade-display-small">
                                                            <span class="grade-score">${sub.grade}/${assignment.max_points}</span>
                                                            <span class="grade-percentage">(${percentage}%)</span>
                                                        </div>
                                                    ` : '--'}
                                                </td>
                                                <td>
                                                    <span class="status-badge ${isGraded ? 'status-graded' : 'status-pending'}">
                                                        ${isGraded ? 'Graded' : 'Pending'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button class="btn btn-sm btn-primary" onclick="gradeSingleSubmission('${sub.id}', '${assignmentId}')">
                                                        ${isGraded ? 'Update' : 'Grade'}
                                                    </button>
                                                    <button class="btn btn-sm btn-outline" onclick="viewSubmissionDetails('${sub.id}')">
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>No submissions yet</p>
                        </div>
                    `}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('submissions-modal')">Close</button>
                    ${submissionsCount > 0 ? `
                        <button class="btn btn-primary" onclick="gradeAssignment('${assignmentId}')">
                            <i class="fas fa-check-circle"></i> Grade All
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        createDynamicModal('submissions-modal', modalContent);
        showModal('submissions-modal');
        
    } catch (error) {
        console.error('Error viewing submissions:', error);
        showToast('Error loading submissions', 'error');
    }
}

// Grade single submission
async function gradeSingleSubmission(submissionId, assignmentId) {
    try {
        // Load submission details
        const { data: submission, error } = await window.supabase
            .from('submissions')
            .select(`
                *,
                assignment:assignments(title, max_points),
                student:consolidated_user_profiles_table(full_name, email)
            `)
            .eq('id', submissionId)
            .single();
        
        if (error) throw error;
        
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Grade Submission</h3>
                    <button class="modal-close" onclick="closeModal('grade-single-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="student-info">
                        <h4>${submission.student?.full_name || submission.student?.email || 'Student'}</h4>
                        <p>Assignment: ${submission.assignment?.title}</p>
                        <p>Submitted: ${formatDateTime(submission.submitted_at)}</p>
                    </div>
                    
                    <div class="submission-content">
                        <h5>Submission:</h5>
                        <p>${submission.content || 'No content'}</p>
                        ${submission.notes ? `<p class="submission-notes"><strong>Notes:</strong> ${submission.notes}</p>` : ''}
                    </div>
                    
                    <div class="grading-form">
                        <div class="form-group">
                            <label for="single-grade">Grade (out of ${submission.assignment?.max_points || 100})</label>
                            <input type="number" id="single-grade" 
                                   class="grade-input" 
                                   value="${submission.grade || ''}" 
                                   min="0" max="${submission.assignment?.max_points || 100}"
                                   placeholder="Enter grade">
                        </div>
                        <div class="form-group">
                            <label for="single-feedback">Feedback</label>
                            <textarea id="single-feedback" 
                                      class="feedback-input" 
                                      rows="4" 
                                      placeholder="Enter feedback...">${submission.feedback || ''}</textarea>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('grade-single-modal')">Cancel</button>
                    <button class="btn btn-primary" onclick="saveSingleGrade('${submissionId}', '${assignmentId}')">Save Grade</button>
                </div>
            </div>
        `;
        
        createDynamicModal('grade-single-modal', modalContent);
        showModal('grade-single-modal');
        
    } catch (error) {
        console.error('Error loading single submission:', error);
        showToast('Error loading submission', 'error');
    }
}

// Save single grade
async function saveSingleGrade(submissionId, assignmentId) {
    const gradeInput = document.getElementById('single-grade');
    const feedbackInput = document.getElementById('single-feedback');
    
    if (!gradeInput || !feedbackInput) return;
    
    const grade = gradeInput.value ? parseInt(gradeInput.value) : null;
    const feedback = feedbackInput.value.trim();
    
    try {
        const { error } = await window.supabase
            .from('submissions')
            .update({
                grade: grade,
                feedback: feedback,
                graded_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', submissionId);
        
        if (error) throw error;
        
        showToast('Grade saved successfully!', 'success');
        closeModal('grade-single-modal');
        
        // Refresh the submissions modal if it's open
        const submissionsModal = document.getElementById('submissions-modal');
        if (submissionsModal && !submissionsModal.classList.contains('hidden')) {
            await viewAssignmentSubmissions(assignmentId);
        }
        
        // Also reload assignments section
        await loadAssignmentsSection();
        
    } catch (error) {
        console.error('Error saving single grade:', error);
        showToast('Error saving grade: ' + error.message, 'error');
    }
}

// View submission details
async function viewSubmissionDetails(submissionId) {
    try {
        const { data: submission, error } = await window.supabase
            .from('submissions')
            .select(`
                *,
                assignment:assignments(title, description, max_points, due_date),
                student:consolidated_user_profiles_table(full_name, email)
            `)
            .eq('id', submissionId)
            .single();
        
        if (error) throw error;
        
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Submission Details</h3>
                    <button class="modal-close" onclick="closeModal('submission-details-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="student-info">
                        <h4>${submission.student?.full_name || submission.student?.email || 'Student'}</h4>
                        <p><strong>Assignment:</strong> ${submission.assignment?.title}</p>
                    </div>
                    
                    <div class="timeline">
                        <div class="timeline-item">
                            <span class="timeline-date">${formatDateTime(submission.submitted_at)}</span>
                            <span class="timeline-event">Submitted</span>
                        </div>
                        ${submission.graded_at ? `
                            <div class="timeline-item">
                                <span class="timeline-date">${formatDateTime(submission.graded_at)}</span>
                                <span class="timeline-event">Graded</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="submission-content">
                        <h5>Submission Content:</h5>
                        <div class="content-box">
                            ${submission.content ? `<p>${submission.content}</p>` : '<p class="text-muted">No content provided</p>'}
                        </div>
                        ${submission.notes ? `
                            <div class="submission-notes">
                                <h6>Student Notes:</h6>
                                <p>${submission.notes}</p>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${submission.grade !== null ? `
                        <div class="grade-display">
                            <h5>Grade:</h5>
                            <div class="grade-box">
                                <span class="grade-score-large">${submission.grade}/${submission.assignment?.max_points || 100}</span>
                                <span class="grade-percentage-large">
                                    (${Math.round((submission.grade / (submission.assignment?.max_points || 100)) * 100)}%)
                                </span>
                            </div>
                            ${submission.feedback ? `
                                <div class="feedback-box">
                                    <h6>Feedback:</h6>
                                    <p>${submission.feedback}</p>
                                </div>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="ungraded-notice">
                            <i class="fas fa-clock"></i>
                            <p>This submission has not been graded yet</p>
                        </div>
                    `}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('submission-details-modal')">Close</button>
                    ${AppState.userRole === 'lecturer' || AppState.userRole === 'admin' || AppState.userRole === 'superadmin' ? `
                        <button class="btn btn-primary" onclick="gradeSingleSubmission('${submissionId}', '${submission.assignment_id}')">
                            ${submission.grade !== null ? 'Update Grade' : 'Grade Now'}
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        createDynamicModal('submission-details-modal', modalContent);
        showModal('submission-details-modal');
        
    } catch (error) {
        console.error('Error viewing submission details:', error);
        showToast('Error loading submission details', 'error');
    }
}

// View assignment details
async function viewAssignmentDetails(assignmentId) {
    try {
        const assignment = AssignmentsState.currentAssignments.find(a => a.id === assignmentId);
        if (!assignment) {
            showToast('Assignment not found', 'error');
            return;
        }
        
        const dueDate = new Date(assignment.due_date);
        const isOverdue = dueDate < new Date();
        const submission = assignment.submissions?.[0];
        const isSubmitted = !!submission?.submitted_at;
        const isGraded = submission?.grade !== null;
        
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Assignment Details</h3>
                    <button class="modal-close" onclick="closeModal('assignment-details-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="assignment-header">
                        <h4>${assignment.title}</h4>
                        <span class="course-badge">${assignment.courses?.course_name || 'General'}</span>
                    </div>
                    
                    <div class="assignment-meta">
                        <div class="meta-item">
                            <i class="fas fa-star"></i>
                            <span>${assignment.max_points || 100} points</span>
                        </div>
                        <div class="meta-item">
                            <i class="far fa-calendar"></i>
                            <span>Due: ${formatDateTime(assignment.due_date)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="status-badge ${isOverdue ? 'status-overdue' : 'status-active'}">
                                ${isOverdue ? 'Overdue' : 'Active'}
                            </span>
                        </div>
                    </div>
                    
                    ${assignment.description ? `
                        <div class="assignment-description">
                            <h5>Description:</h5>
                            <p>${assignment.description}</p>
                        </div>
                    ` : ''}
                    
                    ${assignment.instructions ? `
                        <div class="assignment-instructions">
                            <h5>Instructions:</h5>
                            <p>${assignment.instructions}</p>
                        </div>
                    ` : ''}
                    
                    <div class="student-submission-status">
                        <h5>Your Submission:</h5>
                        ${isSubmitted ? `
                            <div class="submission-status submitted">
                                <i class="fas fa-check-circle"></i>
                                <span>Submitted on ${formatDateTime(submission.submitted_at)}</span>
                            </div>
                            ${isGraded ? `
                                <div class="grade-display">
                                    <div class="grade-score">
                                        <span class="score">${submission.grade}/${assignment.max_points}</span>
                                        <span class="percentage">(${Math.round((submission.grade / assignment.max_points) * 100)}%)</span>
                                    </div>
                                    ${submission.feedback ? `
                                        <div class="feedback">
                                            <h6>Feedback:</h6>
                                            <p>${submission.feedback}</p>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : `
                                <div class="submission-status pending">
                                    <i class="fas fa-clock"></i>
                                    <span>Awaiting grade</span>
                                </div>
                            `}
                        ` : `
                            <div class="submission-status not-submitted">
                                <i class="fas fa-times-circle"></i>
                                <span>Not submitted</span>
                            </div>
                            ${!isOverdue ? `
                                <button class="btn btn-primary" onclick="submitAssignment('${assignmentId}')">
                                    Submit Now
                                </button>
                            ` : `
                                <p class="text-danger">This assignment is now overdue and cannot be submitted</p>
                            `}
                        `}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('assignment-details-modal')">Close</button>
                </div>
            </div>
        `;
        
        createDynamicModal('assignment-details-modal', modalContent);
        showModal('assignment-details-modal');
        
    } catch (error) {
        console.error('Error viewing assignment details:', error);
        showToast('Error loading assignment details', 'error');
    }
}

// View assignment feedback
async function viewAssignmentFeedback(assignmentId) {
    try {
        const assignment = AssignmentsState.currentAssignments.find(a => a.id === assignmentId);
        if (!assignment) {
            showToast('Assignment not found', 'error');
            return;
        }
        
        const submission = assignment.submissions?.[0];
        if (!submission || !submission.feedback) {
            showToast('No feedback available for this assignment', 'info');
            return;
        }
        
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Feedback: ${assignment.title}</h3>
                    <button class="modal-close" onclick="closeModal('feedback-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="assignment-info">
                        <p><strong>Course:</strong> ${assignment.courses?.course_name || 'General'}</p>
                        <p><strong>Submitted:</strong> ${formatDateTime(submission.submitted_at)}</p>
                        <p><strong>Graded:</strong> ${formatDateTime(submission.graded_at)}</p>
                    </div>
                    
                    <div class="grade-summary">
                        <div class="grade-display-large">
                            <span class="grade">${submission.grade}</span>
                            <span class="out-of">/ ${assignment.max_points}</span>
                            <span class="percentage">(${Math.round((submission.grade / assignment.max_points) * 100)}%)</span>
                        </div>
                    </div>
                    
                    <div class="feedback-content">
                        <h4>Instructor Feedback:</h4>
                        <div class="feedback-text">
                            ${submission.feedback}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('feedback-modal')">Close</button>
                </div>
            </div>
        `;
        
        createDynamicModal('feedback-modal', modalContent);
        showModal('feedback-modal');
        
    } catch (error) {
        console.error('Error viewing feedback:', error);
        showToast('Error loading feedback', 'error');
    }
}

// =====================
// GRADES SECTION
// =====================

// Load grades section
async function loadGradesSection() {
    console.log('📊 Loading grades section for:', AppState.userRole);
    
    try {
        const isTeachingRole = AppState.userRole === 'lecturer' || 
                               AppState.userRole === 'admin' || 
                               AppState.userRole === 'superadmin';
        
        if (isTeachingRole) {
            await loadLecturerGrades();
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
                    courses(course_name)
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
                            <td>${assignment?.courses?.course_name || 'General'}</td>
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

// Load lecturer grades
async function loadLecturerGrades() {
    try {
        // Get all assignments created by lecturer
        const { data: assignments, error } = await window.supabase
            .from('assignments')
            .select(`
                *,
                courses(course_name),
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
                            <td>${assignment.courses?.course_name || 'General'}</td>
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
        
        // Update statistics for lecturer
        updateGradeStatistics({
            averageGrade: gradedSubmissions > 0 ? Math.round(averageGrade / gradedSubmissions) : 0,
            totalSubmissions: totalSubmissions,
            gradedSubmissions: gradedSubmissions,
            gradingProgress: totalSubmissions > 0 ? Math.round((gradedSubmissions / totalSubmissions) * 100) : 0
        });
        
    } catch (error) {
        console.error('Error loading lecturer grades:', error);
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
}

// View feedback modal (for grades section)
async function viewFeedbackModal(submissionId) {
    try {
        const { data: submission, error } = await window.supabase
            .from('submissions')
            .select(`
                *,
                assignment:assignments(title, max_points)
            `)
            .eq('id', submissionId)
            .single();
        
        if (error) throw error;
        
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Feedback</h3>
                    <button class="modal-close" onclick="closeModal('view-feedback-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="grade-summary">
                        <h4>${submission.assignment?.title}</h4>
                        <div class="grade-display">
                            <span class="grade">${submission.grade}</span>
                            <span class="out-of">/ ${submission.assignment?.max_points || 100}</span>
                            <span class="percentage">(${Math.round((submission.grade / (submission.assignment?.max_points || 100)) * 100)}%)</span>
                        </div>
                    </div>
                    
                    <div class="feedback-content">
                        <h5>Instructor Feedback:</h5>
                        <div class="feedback-text">
                            ${submission.feedback || 'No feedback provided.'}
                        </div>
                    </div>
                    
                    <div class="feedback-meta">
                        <p><strong>Submitted:</strong> ${formatDateTime(submission.submitted_at)}</p>
                        <p><strong>Graded:</strong> ${submission.graded_at ? formatDateTime(submission.graded_at) : '--'}</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('view-feedback-modal')">Close</button>
                </div>
            </div>
        `;
        
        createDynamicModal('view-feedback-modal', modalContent);
        showModal('view-feedback-modal');
        
    } catch (error) {
        console.error('Error loading feedback:', error);
        showToast('Error loading feedback', 'error');
    }
}

// =====================
// UTILITY FUNCTIONS
// =====================

// Create dynamic modal
function createDynamicModal(modalId, content) {
    // Remove existing modal if it exists
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create new modal
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal hidden';
    modal.innerHTML = content;
    
    // Add to body
    document.body.appendChild(modal);
    
    return modal;
}

// Show modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        console.log(`Modal ${modalId} shown`);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    } else {
        console.error(`Modal ${modalId} not found`);
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        console.log(`Modal ${modalId} closed`);
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

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

// Format date time
function formatDateTime(dateString) {
    if (!dateString) return '--';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Export grades
async function exportGrades() {
    try {
        const isTeachingRole = AppState.userRole === 'lecturer' || 
                               AppState.userRole === 'admin' || 
                               AppState.userRole === 'superadmin';
        
        if (isTeachingRole) {
            await exportLecturerGrades();
        } else {
            await exportStudentGrades();
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
                    courses(course_name)
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
                
                csvContent += `"${assignment?.title || ''}","${assignment?.courses?.course_name || ''}",`;
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

// Export lecturer grades
async function exportLecturerGrades() {
    try {
        // Get all assignments with submissions
        const { data: assignments, error } = await window.supabase
            .from('assignments')
            .select(`
                *,
                courses(course_name),
                submissions(
                    *,
                    student:consolidated_user_profiles_table(full_name, email)
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
                    csvContent += `"${assignment.title}","${assignment.courses?.course_name || ''}",`;
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
        console.error('Error exporting lecturer grades:', error);
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

// Show toast notification
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add to toast container
    const container = document.getElementById('toast-container') || createToastContainer();
    container.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Create toast container if it doesn't exist
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// =====================
// PUBLIC API
// =====================
window.AssignmentsModule = {
    init: initAssignments,
    loadAssignmentsSection: loadAssignmentsSection,
    loadGradesSection: loadGradesSection,
    createAssignmentModal: createAssignmentModal,
    submitAssignment: submitAssignment,
    gradeAssignment: gradeAssignment,
    viewAssignmentDetails: viewAssignmentDetails,
    viewAssignmentFeedback: viewAssignmentFeedback,
    exportGrades: exportGrades,
    filterAssignments: filterAssignments,
    showModal: showModal,
    closeModal: closeModal
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAssignments);
} else {
    initAssignments();
}
