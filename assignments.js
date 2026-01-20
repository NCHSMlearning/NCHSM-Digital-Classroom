// Assignments and Gradebook Functions
let currentAssignments = [];
let currentFilter = 'all';

// Load assignments
async function loadAssignments() {
    try {
        const user = await getCurrentUser();
        
        let query = supabase
            .from('assignments')
            .select('*')
            .order('created_at', { ascending: false });
        
        const { data: assignments, error } = await query;
        
        if (error) throw error;
        
        currentAssignments = assignments || [];
        renderAssignments(currentFilter);
        
    } catch (error) {
        console.error('Error loading assignments:', error);
        showToast('Error loading assignments', 'error');
    }
}

// Render assignments based on filter
function renderAssignments(filter = 'all') {
    currentFilter = filter;
    const assignmentList = document.getElementById('assignment-list');
    
    if (!assignmentList) return;
    
    if (!currentAssignments || currentAssignments.length === 0) {
        assignmentList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <p>No assignments yet</p>
            </div>
        `;
        return;
    }
    
    let filteredAssignments = currentAssignments;
    
    // Apply filter
    if (filter === 'pending') {
        filteredAssignments = currentAssignments.filter(a => 
            new Date(a.due_date) > new Date() && 
            !a.submitted_at
        );
    } else if (filter === 'submitted') {
        filteredAssignments = currentAssignments.filter(a => a.submitted_at);
    } else if (filter === 'graded') {
        filteredAssignments = currentAssignments.filter(a => a.grade !== null);
    }
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.textContent.toLowerCase().includes(filter)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    assignmentList.innerHTML = filteredAssignments.map(assignment => {
        const dueDate = new Date(assignment.due_date);
        const now = new Date();
        const isOverdue = dueDate < now && !assignment.submitted_at;
        const isSubmitted = !!assignment.submitted_at;
        const isGraded = assignment.grade !== null;
        
        let status = 'pending';
        let statusText = 'Pending';
        let statusClass = 'status-pending';
        
        if (isGraded) {
            status = 'graded';
            statusText = 'Graded';
            statusClass = 'status-graded';
        } else if (isSubmitted) {
            status = 'submitted';
            statusText = 'Submitted';
            statusClass = 'status-submitted';
        } else if (isOverdue) {
            status = 'overdue';
            statusText = 'Overdue';
            statusClass = 'status-pending';
        }
        
        return `
            <div class="assignment-item" data-id="${assignment.id}">
                <div class="assignment-info">
                    <h4>${assignment.title}</h4>
                    <div class="assignment-meta">
                        <span><i class="far fa-calendar"></i> Due: ${formatDateTime(assignment.due_date)}</span>
                        <span><i class="fas fa-star"></i> ${assignment.max_points || 100} points</span>
                    </div>
                    ${assignment.description ? `<p class="assignment-desc">${assignment.description.substring(0, 100)}...</p>` : ''}
                </div>
                <div class="assignment-actions">
                    <span class="assignment-status ${statusClass}">${statusText}</span>
                    ${isGraded ? `
                        <span class="assignment-grade">Grade: ${assignment.grade}/${assignment.max_points}</span>
                    ` : ''}
                    ${!isSubmitted ? `
                        <button class="btn btn-primary btn-sm" onclick="submitAssignment('${assignment.id}')">
                            Submit
                        </button>
                    ` : ''}
                    ${isGraded ? `
                        <button class="btn btn-secondary btn-sm" onclick="viewFeedback('${assignment.id}')">
                            Feedback
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Filter assignments
function filterAssignments(filter) {
    renderAssignments(filter);
}

// Create new assignment
async function createAssignment() {
    const user = await getCurrentUser();
    const userRole = user?.user_metadata?.role || 'student';
    
    if (userRole !== 'teacher') {
        showToast('Only teachers can create assignments', 'error');
        return;
    }
    
    // Create modal for assignment creation
    const modalContent = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Create New Assignment</h3>
                <button class="modal-close" onclick="closeModal('create-assignment-modal')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" id="assignment-title" placeholder="Enter assignment title">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="assignment-description" rows="4" placeholder="Enter assignment description"></textarea>
                </div>
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="datetime-local" id="assignment-due-date">
                </div>
                <div class="form-group">
                    <label>Max Points</label>
                    <input type="number" id="assignment-points" value="100" min="1" max="1000">
                </div>
                <div class="form-group">
                    <label>Class</label>
                    <select id="assignment-class">
                        <option value="">Select Class</option>
                        <!-- Classes will be loaded here -->
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('create-assignment-modal')">Cancel</button>
                <button class="btn btn-primary" onclick="saveAssignment()">Create Assignment</button>
            </div>
        </div>
    `;
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('create-assignment-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'create-assignment-modal';
        modal.className = 'modal';
        document.getElementById('modals').appendChild(modal);
    }
    
    modal.innerHTML = modalContent;
    
    // Load classes for dropdown
    await loadClassesForAssignment();
    
    openModal('create-assignment-modal');
}

// Load classes for assignment dropdown
async function loadClassesForAssignment() {
    try {
        const { data: classes, error } = await supabase
            .from('classes')
            .select('id, name')
            .order('name');
        
        if (error) throw error;
        
        const classSelect = document.getElementById('assignment-class');
        if (classSelect && classes) {
            classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = cls.name;
                classSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Error loading classes:', error);
    }
}

// Save assignment
async function saveAssignment() {
    const title = document.getElementById('assignment-title').value;
    const description = document.getElementById('assignment-description').value;
    const dueDate = document.getElementById('assignment-due-date').value;
    const points = document.getElementById('assignment-points').value;
    const classId = document.getElementById('assignment-class').value;
    
    if (!title || !dueDate || !classId) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    try {
        const user = await getCurrentUser();
        
        const { data, error } = await supabase
            .from('assignments')
            .insert([
                {
                    title: title,
                    description: description,
                    due_date: dueDate,
                    max_points: parseInt(points),
                    class_id: classId,
                    created_by: user.id
                }
            ])
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('Assignment created successfully!', 'success');
        closeModal('create-assignment-modal');
        
        // Reload assignments
        loadAssignments();
        
    } catch (error) {
        console.error('Error creating assignment:', error);
        showToast('Error creating assignment: ' + error.message, 'error');
    }
}

// Submit assignment
async function submitAssignment(assignmentId) {
    const user = await getCurrentUser();
    
    const submissionContent = prompt('Enter your submission (or paste a link):');
    if (!submissionContent) return;
    
    try {
        const { data, error } = await supabase
            .from('submissions')
            .insert([
                {
                    assignment_id: assignmentId,
                    student_id: user.id,
                    content: submissionContent,
                    submitted_at: new Date().toISOString()
                }
            ])
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('Assignment submitted successfully!', 'success');
        
        // Update assignment status
        const assignment = currentAssignments.find(a => a.id === assignmentId);
        if (assignment) {
            assignment.submitted_at = new Date().toISOString();
            renderAssignments(currentFilter);
        }
        
    } catch (error) {
        console.error('Error submitting assignment:', error);
        showToast('Error submitting assignment: ' + error.message, 'error');
    }
}

// View feedback
async function viewFeedback(assignmentId) {
    try {
        const user = await getCurrentUser();
        
        const { data: submission, error } = await supabase
            .from('submissions')
            .select('*')
            .eq('assignment_id', assignmentId)
            .eq('student_id', user.id)
            .single();
        
        if (error) throw error;
        
        if (submission) {
            const feedbackModal = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Assignment Feedback</h3>
                        <button class="modal-close" onclick="closeModal('feedback-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="grade-display">
                            <h4>Score: ${submission.grade || 'Not graded yet'}</h4>
                            ${submission.feedback ? `
                                <div class="feedback-content">
                                    <h5>Feedback:</h5>
                                    <p>${submission.feedback}</p>
                                </div>
                            ` : '<p>No feedback provided yet.</p>'}
                        </div>
                    </div>
                </div>
            `;
            
            let modal = document.getElementById('feedback-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'feedback-modal';
                modal.className = 'modal';
                document.getElementById('modals').appendChild(modal);
            }
            
            modal.innerHTML = feedbackModal;
            openModal('feedback-modal');
        }
        
    } catch (error) {
        console.error('Error loading feedback:', error);
        showToast('Error loading feedback', 'error');
    }
}

// Load grades
async function loadGrades() {
    try {
        const user = await getCurrentUser();
        
        // Get submissions with assignment details
        const { data: submissions, error } = await supabase
            .from('submissions')
            .select(`
                *,
                assignments (
                    title,
                    max_points,
                    due_date
                )
            `)
            .eq('student_id', user.id)
            .order('submitted_at', { ascending: false });
        
        if (error) throw error;
        
        // Calculate statistics
        let totalScore = 0;
        let gradedCount = 0;
        let submittedCount = 0;
        let totalPoints = 0;
        
        const gradesTable = document.getElementById('grades-table');
        if (gradesTable) {
            if (submissions && submissions.length > 0) {
                gradesTable.innerHTML = submissions.map(sub => {
                    const assignment = sub.assignments;
                    let gradePercentage = sub.grade ? (sub.grade / assignment.max_points * 100) : 0;
                    let letterGrade = getLetterGrade(gradePercentage);
                    
                    if (sub.grade !== null) {
                        totalScore += gradePercentage;
                        gradedCount++;
                        totalPoints += assignment.max_points;
                    }
                    
                    if (sub.submitted_at) submittedCount++;
                    
                    return `
                        <tr>
                            <td>${assignment.title}</td>
                            <td>${formatDateTime(assignment.due_date)}</td>
                            <td>${sub.submitted_at ? 'Submitted' : 'Not Submitted'}</td>
                            <td>${sub.grade !== null ? `${sub.grade}/${assignment.max_points}` : '--'}</td>
                            <td>${letterGrade}</td>
                            <td>
                                ${sub.feedback ? 
                                    `<button class="btn-link" onclick="viewFeedbackForSubmission('${sub.id}')">View</button>` : 
                                    '--'
                                }
                            </td>
                        </tr>
                    `;
                }).join('');
            } else {
                gradesTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-state">
                            No grades available yet
                        </td>
                    </tr>
                `;
            }
        }
        
        // Update statistics
        const averageGrade = gradedCount > 0 ? Math.round(totalScore / gradedCount) : 0;
        const overallLetterGrade = getLetterGrade(averageGrade);
        
        document.getElementById('overall-grade').textContent = overallLetterGrade;
        document.getElementById('average-score').textContent = `${averageGrade}%`;
        document.getElementById('total-assignments').textContent = submissions?.length || 0;
        document.getElementById('submitted-count').textContent = submittedCount;
        document.getElementById('average-grade').textContent = `${averageGrade}%`;
        
    } catch (error) {
        console.error('Error loading grades:', error);
        showToast('Error loading grades', 'error');
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

// View feedback for specific submission
async function viewFeedbackForSubmission(submissionId) {
    try {
        const { data: submission, error } = await supabase
            .from('submissions')
            .select('*')
            .eq('id', submissionId)
            .single();
        
        if (error) throw error;
        
        if (submission) {
            const feedbackModal = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Feedback Details</h3>
                        <button class="modal-close" onclick="closeModal('submission-feedback-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="feedback-details">
                            <div class="grade-info">
                                <h4>Grade: ${submission.grade}</h4>
                                <p>Submitted: ${formatDateTime(submission.submitted_at)}</p>
                            </div>
                            <div class="feedback-content">
                                <h5>Teacher's Feedback:</h5>
                                <p>${submission.feedback || 'No feedback provided.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            let modal = document.getElementById('submission-feedback-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'submission-feedback-modal';
                modal.className = 'modal';
                document.getElementById('modals').appendChild(modal);
            }
            
            modal.innerHTML = feedbackModal;
            openModal('submission-feedback-modal');
        }
        
    } catch (error) {
        console.error('Error loading submission feedback:', error);
        showToast('Error loading feedback', 'error');
    }
}

// Export grades
async function exportGrades() {
    try {
        const user = await getCurrentUser();
        
        const { data: submissions, error } = await supabase
            .from('submissions')
            .select(`
                *,
                assignments (
                    title,
                    max_points,
                    due_date
                )
            `)
            .eq('student_id', user.id);
        
        if (error) throw error;
        
        // Create CSV content
        let csvContent = "Assignment,Due Date,Status,Score,Grade,Feedback\n";
        
        if (submissions && submissions.length > 0) {
            submissions.forEach(sub => {
                const assignment = sub.assignments;
                const gradePercentage = sub.grade ? (sub.grade / assignment.max_points * 100) : 0;
                const letterGrade = getLetterGrade(gradePercentage);
                
                csvContent += `"${assignment.title}","${formatDateTime(assignment.due_date)}",`;
                csvContent += `${sub.submitted_at ? 'Submitted' : 'Not Submitted'},`;
                csvContent += `${sub.grade !== null ? `${sub.grade}/${assignment.max_points}` : '--'},`;
                csvContent += `${letterGrade},"${sub.feedback || ''}"\n`;
            });
        }
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grades_${user.email}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('Grades exported successfully!', 'success');
        
    } catch (error) {
        console.error('Error exporting grades:', error);
        showToast('Error exporting grades', 'error');
    }
}

// Initialize assignments module
async function initAssignments() {
    // Load assignments on section show
    document.addEventListener('sectionChanged', async (event) => {
        if (event.detail.section === 'assignments') {
            await loadAssignments();
        } else if (event.detail.section === 'grades') {
            await loadGrades();
        }
    });
}
