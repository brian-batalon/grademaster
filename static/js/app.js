// ─── STATE ───
let currentPage = 'sections';
let currentSection = null;
let sectionsData = {};
let attendanceData = [];

// ─── TOAST NOTIFICATIONS ───
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.style.cssText = `
        background: ${colors[type] || colors.info};
        color: #fff;
        padding: 12px 20px;
        border-radius: 10px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    toast.innerHTML = `<i class="bi bi-${icons[type]}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ─── CONFIRM DIALOG (inline) ───
function showConfirm(message, onYes) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-dialog">
            <p>${message}</p>
            <div class="d-flex gap-2 justify-content-end">
                <button class="btn btn-sm btn-secondary" id="confirmNo">Cancel</button>
                <button class="btn btn-sm btn-primary" id="confirmYes">Yes</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirmYes').onclick = () => {
        overlay.remove();
        onYes();
    };
    overlay.querySelector('#confirmNo').onclick = () => overlay.remove();
}

// ─── DOM REFS ───
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const pageContent = document.getElementById('pageContent');
const pageTitle = document.getElementById('pageTitle');

// ─── SIDEBAR TOGGLE ───
const isMobile = () => window.innerWidth <= 768;

if (isMobile()) {
    sidebar.classList.add('hidden');
}

document.getElementById('toggleSidebar').addEventListener('click', () => {
    if (isMobile()) {
        if (sidebar.classList.contains('hidden')) {
            sidebar.classList.remove('hidden');
            sidebar.classList.add('show');
            let overlay = document.querySelector('.sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay';
                document.body.appendChild(overlay);
            }
            overlay.classList.add('active');
        } else {
            closeMobileSidebar();
        }
    } else {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    }
});

function closeMobileSidebar() {
    sidebar.classList.add('hidden');
    sidebar.classList.remove('show');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.classList.remove('active');
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('sidebar-overlay')) {
        closeMobileSidebar();
    }
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        if (isMobile()) closeMobileSidebar();
    });
});

window.addEventListener('resize', () => {
    if (!isMobile()) {
        sidebar.classList.remove('hidden', 'show');
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.classList.remove('active');
    } else {
        if (!sidebar.classList.contains('show')) {
            sidebar.classList.add('hidden');
        }
    }
});

// ─── NAVIGATION ───
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.nav-link.active').classList.remove('active');
        link.classList.add('active');
        currentPage = link.dataset.page;
        currentSection = null;
        if (currentPage === 'sections') {
            pageTitle.textContent = 'Sections';
            renderSectionsPage();
        } else if (currentPage === 'settings') {
            pageTitle.textContent = 'Theme Settings';
            renderSettingsPage();
        }
    });
});

// ─── RESET ───
document.getElementById('resetBtn').addEventListener('click', () => {
    showConfirm('Reset ALL sections, students, and rubrics?', async () => {
        await fetch('/api/reset');
        sectionsData = {};
        renderSectionsPage();
        showToast('All data has been reset', 'warning');
    });
});

// ─── LOAD SECTIONS ───
async function loadSections() {
    const res = await fetch('/api/sections');
    const list = await res.json();
    sectionsData = {};
    for (const name of list) {
        const r = await fetch(`/api/sections/${name}/rubrics`);
        sectionsData[name] = await r.json();
    }
}

// ═══════════════ SECTIONS PAGE ═══════════════
async function renderSectionsPage() {
    currentSection = null;
    pageTitle.textContent = 'Sections';
    await loadSections();
    
    const sectionNames = Object.keys(sectionsData);
    pageContent.innerHTML = `
        <div style="margin-bottom:16px;">
            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#sectionModal">
                <i class="bi bi-plus-lg"></i> New Section
            </button>
        </div>
        <div class="section-grid">
            ${sectionNames.length === 0 ? '<p class="text-muted">No sections yet. Create one to get started.</p>' : ''}
            ${sectionNames.map(name => {
                const sec = sectionsData[name];
                const studentCount = sec.students ? sec.students.length : 0;
                const rubricCount = sec.rubrics ? sec.rubrics.length : 0;
                return `
                    <div class="section-card" onclick="openSection('${name}')">
                        <span class="delete-section" onclick="event.stopPropagation(); deleteSection('${name}')">
                            <i class="bi bi-x-lg"></i>
                        </span>
                        <div class="section-icon"><i class="bi bi-collection-fill"></i></div>
                        <h6>${name}</h6>
                        <div class="section-meta">
                            ${studentCount} student${studentCount !== 1 ? 's' : ''} · 
                            ${rubricCount} rubric${rubricCount !== 1 ? 's' : ''} · 
                            Passing: ${sec.passing_grade || 75}%
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    document.getElementById('saveSection').onclick = async () => {
        const input = document.getElementById('sectionNameInput');
        const name = input.value.trim();
        if (!name) {
            showToast('Please enter a section name', 'warning');
            return;
        }
        const res = await fetch('/api/sections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!res.ok) {
            const err = await res.json();
            showToast(err.message, 'error');
            return;
        }
        input.value = '';
        bootstrap.Modal.getInstance(document.getElementById('sectionModal')).hide();
        showToast(`Section "${name}" created!`, 'success');
        await renderSectionsPage();
    };
}

async function deleteSection(name) {
    showConfirm(`Delete section "${name}" and all its data?`, async () => {
        await fetch('/api/sections', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        delete sectionsData[name];
        showToast(`Section "${name}" deleted`, 'warning');
        renderSectionsPage();
    });
}

function openSection(name) {
    currentSection = name;
    pageTitle.textContent = name;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    renderSectionDetail(name);
}

// ═══════════════ SECTION DETAIL PAGE ═══════════════
async function renderSectionDetail(name) {
    const res = await fetch(`/api/sections/${name}/rubrics`);
    const sec = await res.json();
    sectionsData[name] = sec;
    const students = sec.students || [];
    const rubrics = sec.rubrics || [];
    const passing = sec.passing_grade || 75;

    let tableHeaders = '<th>#</th><th>Last Name</th><th>First Name</th><th>Email</th>';
    rubrics.forEach(r => {
        if (r.items && r.items.length > 0) {
            r.items.forEach(item => {
                const itemName = typeof item === 'object' ? item.name : item;
                const itemTotal = typeof item === 'object' && item.total_items ? item.total_items : null;
                const hint = itemTotal ? ` (${itemTotal} items)` : '';
                tableHeaders += `<th>${r.name}<br><small>${itemName}${hint}</small></th>`;
            });
        } else {
            tableHeaders += `<th>${r.name}<br><small>${r.weight}%</small></th>`;
        }
    });
    tableHeaders += '<th>Final</th><th>Grade Point</th><th>Remark</th><th>Status</th><th>Actions</th>';

    let tableRows = '';
    if (students.length === 0) {
        tableRows = `<tr><td colspan="100%" class="text-center text-muted py-3">No students added yet.</td></tr>`;
    } else {
        tableRows = students.map((s, i) => {
            let row = `<td>${i + 1}</td>`;
            row += `<td><strong>${s.last_name || '-'}</strong></td>`;
            row += `<td>${s.first_name || '-'}</td>`;
            row += `<td><small>${s.email || '-'}</small></td>`;
            rubrics.forEach(r => {
                if (r.items && r.items.length > 0) {
                    r.items.forEach(item => {
                        const itemName = typeof item === 'object' ? item.name : item;
                        const key = `${r.name}::${itemName}`;
                        const score = s.scores ? (s.scores[key] || '') : '';
                        row += `<td class="editable-cell" contenteditable="true" data-key="${key}" data-student="${i}">${score}</td>`;
                    });
                } else {
                    const score = s.scores ? (s.scores[r.name] || '') : '';
                    row += `<td class="editable-cell" contenteditable="true" data-key="${r.name}" data-student="${i}">${score}</td>`;
                }
            });
            row += `<td class="final-cell"><strong>${s.final_grade !== null && s.final_grade !== undefined ? s.final_grade + '%' : '-'}</strong></td>`;
            row += `<td class="gp-cell"><strong>${s.grade_point !== null && s.grade_point !== undefined ? s.grade_point.toFixed(2) : '-'}</strong></td>`;
            row += `<td class="remark-cell">${s.remark || '-'}</td>`;
            
            let statusBadge = '';
            if (s.status === 'PASSED') statusBadge = '<span class="badge-pass">PASSED</span>';
            else if (s.status === 'FAILED') statusBadge = '<span class="badge-fail">FAILED</span>';
            else if (s.status === 'INC') statusBadge = '<span class="badge-inc">INC</span>';
            else if (s.status === 'AD') statusBadge = '<span class="badge-ad">AD</span>';
            else if (s.status === 'UD') statusBadge = '<span class="badge-ud">UD</span>';
            else statusBadge = '<span>-</span>';
            row += `<td class="status-cell">${statusBadge}</td>`;
            
            row += `<td>
                <button class="btn btn-sm btn-outline text-info me-1" onclick="emailStudent('${name}', ${i})" title="Email"><i class="bi bi-envelope"></i></button>
                <button class="btn btn-sm btn-outline text-danger" onclick="deleteStudent('${name}', ${i})" title="Delete"><i class="bi bi-trash"></i></button>
            </td>`;
            return `<tr data-student-row="${i}">${row}</tr>`;
        }).join('');
    }

    const hasEmails = students.some(s => s.email);

    pageContent.innerHTML = `
        <div class="back-btn" onclick="renderSectionsPage(); document.querySelectorAll('.nav-link')[0].classList.add('active');">
            <i class="bi bi-arrow-left"></i> Back to Sections
        </div>
        <div class="row g-3 mb-3">
            <div class="col-md-3">
                <div class="card"><div class="card-body text-center">
                    <h3>${students.length}</h3><small class="text-muted">Students</small>
                </div></div>
            </div>
            <div class="col-md-3">
                <div class="card"><div class="card-body text-center">
                    <h3>${rubrics.length}</h3><small class="text-muted">Rubrics</small>
                </div></div>
            </div>
            <div class="col-md-3">
                <div class="card"><div class="card-body text-center">
                    <h3>${passing}%</h3><small class="text-muted">Passing</small>
                </div></div>
            </div>
            <div class="col-md-3">
                <div class="card"><div class="card-body text-center">
                    <h3 class="${getPassRate(students) >= 50 ? 'text-success' : 'text-danger'}">${getPassRate(students)}%</h3>
                    <small class="text-muted">Pass Rate</small>
                </div></div>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <span>Students (Sorted by Surname A-Z)</span>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${rubrics.length === 0 ? '<small class="text-warning me-2">Configure rubrics first!</small>' : ''}
                    <button class="btn btn-outline btn-sm" onclick="openRubricModal('${name}')">
                        <i class="bi bi-sliders"></i> Rubrics
                    </button>
                    ${students.length > 0 ? `<button class="btn btn-outline btn-sm" onclick="openAttendanceModal('${name}')"><i class="bi bi-calendar-check"></i> Attendance</button>` : ''}
                    <button class="btn btn-primary btn-sm" onclick="openStudentModal('${name}')" ${rubrics.length === 0 ? 'disabled' : ''}>
                        <i class="bi bi-plus-lg"></i> Add Student
                    </button>
                    ${students.length > 0 && hasEmails ? `<button class="btn btn-outline-info btn-sm" onclick="emailAllStudents('${name}')" title="Email All"><i class="bi bi-envelope-fill"></i> Email All</button>` : ''}
                    <button class="btn btn-outline btn-sm" onclick="window.open('/api/sections/${name}/export')">
                        <i class="bi bi-download"></i> Export
                    </button>
                </div>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table">
                        <thead><tr>${tableHeaders}</tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
                <div class="p-3">
                    <small class="text-muted">
                        <strong>Tips:</strong> Click on a score cell to edit. Scores auto-save when you click away. Use <strong>INC</strong>, <strong>AD</strong>, or <strong>UD</strong> for special statuses.
                    </small>
                </div>
            </div>
        </div>
    `;
}

function getPassRate(students) {
    if (students.length === 0) return 0;
    const passed = students.filter(s => s.status === 'PASSED').length;
    return Math.round((passed / students.length) * 100);
}

// ─── INLINE EDIT (no table re-render, auto-save on blur) ───
async function saveInlineEdit(sectionName, studentIndex) {
    const sec = sectionsData[sectionName];
    if (!sec) return;
    const student = sec.students[studentIndex];
    if (!student) return;
    
    const scores = { ...student.scores } || {};
    
    document.querySelectorAll(`.editable-cell[data-student="${studentIndex}"]`).forEach(cell => {
        const key = cell.dataset.key;
        const value = cell.textContent.trim();
        scores[key] = value === '' ? '' : value;
    });
    
    const updatedStudent = {
        index: studentIndex,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        scores: scores
    };
    
    const res = await fetch(`/api/sections/${sectionName}/students`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStudent)
    });
    const data = await res.json();
    if (data.status === 'success') {
        sectionsData[sectionName].students[studentIndex] = data.student;
        
        const row = document.querySelector(`tr[data-student-row="${studentIndex}"]`);
        if (row) {
            const finalCell = row.querySelector('.final-cell');
            const gpCell = row.querySelector('.gp-cell');
            const remarkCell = row.querySelector('.remark-cell');
            const statusCell = row.querySelector('.status-cell');
            
            if (finalCell) finalCell.innerHTML = `<strong>${data.student.final_grade !== null && data.student.final_grade !== undefined ? data.student.final_grade + '%' : '-'}</strong>`;
            if (gpCell) gpCell.innerHTML = `<strong>${data.student.grade_point !== null && data.student.grade_point !== undefined ? data.student.grade_point.toFixed(2) : '-'}</strong>`;
            if (remarkCell) remarkCell.textContent = data.student.remark || '-';
            
            if (statusCell) {
                let statusBadge = '';
                if (data.student.status === 'PASSED') statusBadge = '<span class="badge-pass">PASSED</span>';
                else if (data.student.status === 'FAILED') statusBadge = '<span class="badge-fail">FAILED</span>';
                else if (data.student.status === 'INC') statusBadge = '<span class="badge-inc">INC</span>';
                else if (data.student.status === 'AD') statusBadge = '<span class="badge-ad">AD</span>';
                else if (data.student.status === 'UD') statusBadge = '<span class="badge-ud">UD</span>';
                else statusBadge = '<span>-</span>';
                statusCell.innerHTML = statusBadge;
            }
        }
    }
}

// ─── AUTO-SAVE ON BLUR ───
document.addEventListener('focusout', function(e) {
    if (e.target.classList.contains('editable-cell')) {
        const studentIdx = parseInt(e.target.dataset.student);
        const section = currentSection;
        if (!isNaN(studentIdx) && section) {
            saveInlineEdit(section, studentIdx);
        }
    }
});

// ─── EMAIL STUDENT ───
async function emailStudent(sectionName, index) {
    const student = sectionsData[sectionName].students[index];
    if (!student.email) {
        showToast('No email address for this student.', 'warning');
        return;
    }
    showConfirm(`Send grade report to ${student.last_name}, ${student.first_name} (${student.email})?`, async () => {
        showToast('Sending email...', 'info');
        const res = await fetch(`/api/sections/${sectionName}/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index })
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast(`Email sent to ${student.email}!`, 'success');
        } else {
            showToast(`Failed: ${data.message}`, 'error');
        }
    });
}

// ─── EMAIL ALL STUDENTS ───
async function emailAllStudents(sectionName) {
    const students = sectionsData[sectionName].students || [];
    const withEmails = students.filter(s => s.email);
    if (withEmails.length === 0) {
        showToast('No students have email addresses.', 'warning');
        return;
    }
    showConfirm(`Send grade reports to all ${withEmails.length} student(s) with email?`, async () => {
        showToast(`Sending ${withEmails.length} emails...`, 'info');
        let sent = 0;
        let failed = 0;
        for (let i = 0; i < students.length; i++) {
            if (students[i].email) {
                const res = await fetch(`/api/sections/${sectionName}/email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ index: i })
                });
                const data = await res.json();
                if (data.status === 'success') sent++;
                else failed++;
            }
        }
        if (failed === 0) {
            showToast(`All ${sent} emails sent successfully!`, 'success');
        } else {
            showToast(`${sent} sent, ${failed} failed.`, 'warning');
        }
    });
}

// ═══════════════ ATTENDANCE MODAL ═══════════════
async function openAttendanceModal(sectionName) {
    const res = await fetch(`/api/sections/${sectionName}/attendance`);
    attendanceData = await res.json();
    const students = sectionsData[sectionName].students || [];
    
    const modal = new bootstrap.Modal(document.getElementById('attendanceModal'));
    modal.show();
    
    document.getElementById('addAttendanceDate').onclick = () => {
        const dateInput = document.getElementById('attendanceDate');
        const date = dateInput.value.trim();
        if (!date) {
            showToast('Enter a date', 'warning');
            return;
        }
        if (attendanceData.find(a => a.date === date)) {
            showToast('Date already exists', 'warning');
            return;
        }
        const records = {};
        students.forEach((s, i) => { records[i] = ''; });
        attendanceData.push({ date, records });
        attendanceData.sort((a, b) => a.date.localeCompare(b.date));
        dateInput.value = '';
        renderAttendanceTable(students);
        saveAttendance(sectionName, date, records);
    };
    
    renderAttendanceTable(students);
}

function renderAttendanceTable(students) {
    const thead = document.getElementById('attendanceTable').querySelector('thead');
    const tbody = document.getElementById('attendanceTable').querySelector('tbody');
    
    let headerRow = '<tr><th>#</th><th>Name</th>';
    attendanceData.forEach(a => {
        headerRow += `<th>${a.date} <i class="bi bi-x-circle" style="cursor:pointer;font-size:12px;color:var(--danger)" onclick="deleteAttendanceDate('${a.date}')"></i></th>`;
    });
    headerRow += '</tr>';
    thead.innerHTML = headerRow;
    
    tbody.innerHTML = students.map((s, i) => {
        let row = `<td>${i + 1}</td><td><strong>${s.last_name}, ${s.first_name}</strong></td>`;
        attendanceData.forEach(a => {
            const val = (a.records && a.records[i]) ? a.records[i] : '';
            const bg = val === 'P' ? '#d1fae5' : val === 'L' ? '#fef3c7' : val === 'A' ? '#fee2e2' : '';
            row += `<td style="background:${bg};cursor:pointer;text-align:center;font-weight:600;" onclick="cycleAttendance('${a.date}', ${i})">${val || '-'}</td>`;
        });
        row += '</tr>';
        return row;
    }).join('');
}

function cycleAttendance(date, studentIndex) {
    const record = attendanceData.find(a => a.date === date);
    if (!record) return;
    const current = record.records[studentIndex] || '';
    const cycle = ['', 'P', 'L', 'A'];
    const nextIdx = (cycle.indexOf(current) + 1) % cycle.length;
    record.records[studentIndex] = cycle[nextIdx];
    saveAttendance(currentSection, date, record.records);
    renderAttendanceTable(sectionsData[currentSection].students);
}

async function saveAttendance(sectionName, date, records) {
    await fetch(`/api/sections/${sectionName}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, records })
    });
}

async function deleteAttendanceDate(date) {
    showConfirm(`Delete attendance for "${date}"?`, async () => {
        await fetch(`/api/sections/${currentSection}/attendance/${date}`, { method: 'DELETE' });
        attendanceData = attendanceData.filter(a => a.date !== date);
        renderAttendanceTable(sectionsData[currentSection].students);
        showToast(`Attendance "${date}" deleted`, 'warning');
    });
}

// ═══════════════ RUBRIC MODAL ═══════════════
let tempRubrics = [];
let tempSubItems = {};

function openRubricModal(sectionName) {
    const sec = sectionsData[sectionName];
    tempRubrics = JSON.parse(JSON.stringify(sec.rubrics || []));
    tempSubItems = {};
    tempRubrics.forEach(r => {
        if (r.items) tempSubItems[r.name] = [...r.items];
        else tempSubItems[r.name] = [];
    });
    document.getElementById('rubricPassingGrade').value = sec.passing_grade || 75;
    renderRubricList();
    const modal = new bootstrap.Modal(document.getElementById('rubricModal'));
    modal.show();

    document.getElementById('addRubricBtn').onclick = () => {
        const nameInput = document.getElementById('rubricName');
        const weightInput = document.getElementById('rubricWeight');
        const name = nameInput.value.trim();
        const weight = parseFloat(weightInput.value);
        if (!name || !weight) {
            showToast('Fill name and weight fields', 'warning');
            return;
        }
        if (tempRubrics.find(r => r.name === name)) {
            showToast('Rubric already exists', 'warning');
            return;
        }
        tempRubrics.push({ name, weight, items: [] });
        tempSubItems[name] = [];
        nameInput.value = '';
        weightInput.value = '';
        renderRubricList();
    };

    document.getElementById('saveRubrics').onclick = async () => {
        const totalWeight = tempRubrics.reduce((s, r) => s + r.weight, 0);
        if (totalWeight !== 100) {
            showToast(`Total weight must be 100%. Currently: ${totalWeight}%`, 'error');
            return;
        }
        const passing = parseInt(document.getElementById('rubricPassingGrade').value) || 75;
        tempRubrics.forEach(r => {
            r.items = tempSubItems[r.name] || [];
        });
        await fetch(`/api/sections/${sectionName}/rubrics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rubrics: tempRubrics, passing_grade: passing })
        });
        bootstrap.Modal.getInstance(document.getElementById('rubricModal')).hide();
        showToast('Rubrics saved!', 'success');
        renderSectionDetail(sectionName);
    };
}

function renderRubricList() {
    const container = document.getElementById('rubricList');
    const totalWeight = tempRubrics.reduce((s, r) => s + r.weight, 0);

    container.innerHTML = tempRubrics.length === 0 
        ? '<p class="text-muted">No rubrics yet.</p>'
        : tempRubrics.map((r, i) => `
            <div class="rubric-item">
                <div>
                    <span class="rubric-info">${r.name}</span>
                    <span class="rubric-weight">- ${r.weight}%</span>
                    ${(tempSubItems[r.name] || []).length > 0 ? `
                        <div class="sub-items-list">
                            ${tempSubItems[r.name].map(si => {
                                const siName = typeof si === 'object' ? si.name : si;
                                const siItems = typeof si === 'object' && si.total_items ? ` (${si.total_items} items)` : '';
                                return `<span>${siName}${siItems} <i class="bi bi-x" style="cursor:pointer;font-size:10px" onclick="removeSubItem('${r.name}','${siName}')"></i></span>`;
                            }).join('')}
                        </div>
                    ` : ''}
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button class="btn btn-sm btn-outline" onclick="addSubItem('${r.name}')" title="Add sub-item">+ Sub</button>
                    <span style="cursor:pointer;color:var(--danger)" onclick="removeRubric(${i})"><i class="bi bi-trash"></i></span>
                </div>
            </div>
        `).join('');

    container.innerHTML += `
        <div class="mt-2">
            <strong>Total: <span style="color:${totalWeight === 100 ? 'var(--success)' : 'var(--danger)'}">${totalWeight}%</span></strong>
        </div>
    `;
}

function addSubItem(rubricName) {
    const existing = document.querySelector('.inline-sub-input-row');
    if (existing) existing.remove();
    
    const container = document.getElementById('rubricList');
    const row = document.createElement('div');
    row.className = 'inline-sub-input-row';
    row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:8px;padding:8px;background:#f0f9ff;border-radius:8px;flex-wrap:wrap;';
    row.innerHTML = `
        <input type="text" class="form-control form-control-sm" id="inlineSubInput" placeholder="Sub-item name (e.g., Prelim)" style="flex:2;min-width:150px;">
        <input type="number" class="form-control form-control-sm" id="inlineSubItems" placeholder="Total items (e.g., 100)" style="flex:1;min-width:120px;" min="1">
        <button class="btn btn-sm btn-primary" id="inlineSubAdd">Add</button>
        <button class="btn btn-sm btn-secondary" id="inlineSubCancel">Cancel</button>
    `;
    container.appendChild(row);
    
    const nameInput = row.querySelector('#inlineSubInput');
    const itemsInput = row.querySelector('#inlineSubItems');
    setTimeout(() => nameInput.focus(), 100);
    
    const done = () => {
        const name = nameInput.value.trim();
        const totalItems = itemsInput.value ? parseInt(itemsInput.value) : null;
        row.remove();
        if (!name) return;
        if (!tempSubItems[rubricName]) tempSubItems[rubricName] = [];
        if (tempSubItems[rubricName].find(si => (typeof si === 'object' ? si.name : si) === name)) {
            showToast('Already exists', 'warning');
            return;
        }
        tempSubItems[rubricName].push({ name, total_items: totalItems });
        renderRubricList();
    };
    
    row.querySelector('#inlineSubAdd').onclick = () => done();
    row.querySelector('#inlineSubCancel').onclick = () => { row.remove(); };
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); itemsInput.focus(); }
        if (e.key === 'Escape') { row.remove(); }
    });
    itemsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); done(); }
        if (e.key === 'Escape') { row.remove(); }
    });
}

function removeSubItem(rubricName, itemName) {
    tempSubItems[rubricName] = tempSubItems[rubricName].filter(i => (typeof i === 'object' ? i.name : i) !== itemName);
    renderRubricList();
}

function removeRubric(index) {
    const name = tempRubrics[index].name;
    tempRubrics.splice(index, 1);
    delete tempSubItems[name];
    renderRubricList();
}

// ═══════════════ STUDENT MODAL ═══════════════
function openStudentModal(sectionName) {
    document.getElementById('studentFirstName').value = '';
    document.getElementById('studentLastName').value = '';
    document.getElementById('studentEmailInput').value = '';
    const modal = new bootstrap.Modal(document.getElementById('studentModal'));
    modal.show();

    document.getElementById('saveStudent').onclick = async () => {
        const firstName = document.getElementById('studentFirstName').value.trim();
        const lastName = document.getElementById('studentLastName').value.trim();
        if (!firstName || !lastName) {
            showToast('Enter both first and last name', 'warning');
            return;
        }
        const email = document.getElementById('studentEmailInput').value.trim();
        
        const res = await fetch(`/api/sections/${sectionName}/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_name: firstName, last_name: lastName, email, scores: {} })
        });
        const data = await res.json();
        bootstrap.Modal.getInstance(document.getElementById('studentModal')).hide();
        showToast(`Student "${lastName}, ${firstName}" added!`, 'success');
        renderSectionDetail(sectionName);
    };
}

async function deleteStudent(sectionName, index) {
    const student = sectionsData[sectionName].students[index];
    showConfirm(`Delete "${student.last_name}, ${student.first_name}"?`, async () => {
        await fetch(`/api/sections/${sectionName}/students`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index })
        });
        showToast('Student deleted', 'warning');
        renderSectionDetail(sectionName);
    });
}

// ═══════════════ THEME SETTINGS ═══════════════
function renderSettingsPage() {
    const style = getComputedStyle(document.documentElement);
    const getVar = (name) => style.getPropertyValue(name).trim();

    pageContent.innerHTML = `
        <div class="card">
            <div class="card-header">Theme Customization</div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="mb-3">Colors</h6>
                        ${[
                            ['--accent', 'Accent Color'],
                            ['--sidebar-bg', 'Sidebar Background'],
                            ['--bg', 'Page Background'],
                            ['--card-bg', 'Card Background'],
                            ['--text', 'Text Color'],
                            ['--success', 'Passed Color'],
                            ['--danger', 'Failed Color'],
                        ].map(([prop, label]) => `
                            <div class="color-picker-group">
                                <label>${label}</label>
                                <input type="color" value="${getVar(prop)}" data-prop="${prop}" class="theme-color">
                                <small>${getVar(prop)}</small>
                            </div>
                        `).join('')}
                    </div>
                    <div class="col-md-6">
                        <h6 class="mb-3">Layout</h6>
                        <div class="mb-3">
                            <label class="form-label">Border Radius</label>
                            <input type="range" class="form-range" id="borderRadius" min="0" max="24" value="${parseInt(getVar('--border-radius'))}">
                            <small id="borderRadiusVal">${getVar('--border-radius')}</small>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Sidebar Width</label>
                            <input type="range" class="form-range" id="sidebarWidth" min="200" max="350" value="${parseInt(getVar('--sidebar-width'))}">
                            <small id="sidebarWidthVal">${getVar('--sidebar-width')}</small>
                        </div>
                        <button class="btn btn-outline mt-3" id="resetTheme">Reset to Default</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-header">Preview</div>
            <div class="card-body">
                <span class="badge-pass">PASSED</span>
                <span class="badge-fail ms-2">FAILED</span>
                <button class="btn btn-primary ms-3">Sample Button</button>
            </div>
        </div>
    `;

    document.querySelectorAll('.theme-color').forEach(input => {
        input.addEventListener('input', (e) => {
            document.documentElement.style.setProperty(e.target.dataset.prop, e.target.value);
            e.target.nextElementSibling.textContent = e.target.value;
        });
    });

    document.getElementById('borderRadius').addEventListener('input', function() {
        document.documentElement.style.setProperty('--border-radius', this.value + 'px');
        document.getElementById('borderRadiusVal').textContent = this.value + 'px';
    });

    document.getElementById('sidebarWidth').addEventListener('input', function() {
        document.documentElement.style.setProperty('--sidebar-width', this.value + 'px');
        document.getElementById('sidebarWidthVal').textContent = this.value + 'px';
    });

    document.getElementById('resetTheme').onclick = () => {
        document.documentElement.style.cssText = '';
        renderSettingsPage();
        showToast('Theme reset to default', 'info');
    };
}

// ─── LOGOUT WITH EFFECT ───
function logoutWithEffect() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;animation:fadeIn 0.3s ease;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px;padding:40px;text-align:center;animation:scaleIn 0.4s ease;">
            <div style="width:70px;height:70px;background:#fee2e2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                <i class="bi bi-box-arrow-right" style="font-size:32px;color:#ef4444;"></i>
            </div>
            <h4 style="font-weight:700;">Logging Out</h4>
            <p style="color:#64748b;">See you next time!</p>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => { window.location.href = '/logout'; }, 1500);
}

document.addEventListener('click', function(e) {
    if (e.target.closest('a[href="/logout"]')) {
        e.preventDefault();
        logoutWithEffect();
    }
});

// ─── LIVE DEMO TUTORIAL ───
let demoTourStep = 0;
let demoTourActive = false;

function highlightElement(el) {
    if (!el) return;
    document.querySelectorAll('.demo-highlight-target').forEach(e => e.classList.remove('demo-highlight-target'));
    el.classList.add('demo-highlight-target');
}

function removeAllHighlights() {
    document.querySelectorAll('.demo-highlight-target').forEach(e => e.classList.remove('demo-highlight-target'));
}

function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) { observer.disconnect(); resolve(el); }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    });
}

function typeText(input, text, delay = 50) {
    return new Promise(async (resolve) => {
        input.value = '';
        input.focus();
        for (let char of text) {
            input.value += char;
            input.dispatchEvent(new Event('input'));
            await new Promise(r => setTimeout(r, delay));
        }
        resolve();
    });
}

async function startDemo() {
    removeAllHighlights();
    removeDemoElements();
    
    if (currentSection) {
        document.querySelector('.back-btn')?.click();
        await new Promise(r => setTimeout(r, 400));
    }
    if (currentPage !== 'sections') {
        document.querySelector('[data-page="sections"]')?.click();
        await new Promise(r => setTimeout(r, 400));
    }
    document.querySelectorAll('.modal').forEach(m => {
        const instance = bootstrap.Modal.getInstance(m);
        if (instance) instance.hide();
    });
    await new Promise(r => setTimeout(r, 300));
    
    demoTourStep = 0;
    demoTourActive = true;
    showDemoStep();
}

async function showDemoStep() {
    removeDemoElements();
    removeAllHighlights();
    
    if (demoTourStep >= 11) {
        demoTourActive = false;
        showToast('Demo complete! 🎉 Click ? to replay.', 'success');
        return;
    }
    
    const steps = [
        { title: 'Welcome! 👋', text: 'Let me show you how to set up your grading system. Click <strong>Next</strong> to start!' },
        { title: '1. New Section', text: 'Click <strong>Next</strong> to open the New Section dialog.' },
        { title: '2. Name It', text: 'I\'ll name it <strong>BSIT-3A</strong> for you. Click <strong>Next</strong>.' },
        { title: '3. Create', text: 'Click <strong>Next</strong> to save this section.' },
        { title: '4. Open Section', text: 'Click <strong>Next</strong> to open <strong>BSIT-3A</strong>.' },
        { title: '5. Rubrics', text: 'Click <strong>Next</strong> to open Rubrics settings.' },
        { title: '6. Save Rubrics', text: 'Added 3 rubrics = 100%. Click <strong>Next</strong> to save.' },
        { title: '7. Add Student', text: 'Click <strong>Next</strong> to add Juan Dela Cruz.' },
        { title: '8. Enter Score', text: 'Click <strong>Next</strong> to enter a score of 85.' },
        { title: '9. Attendance', text: 'Click <strong>Next</strong> to open Attendance.' },
        { title: 'Done! 🚀', text: 'Export Excel, email reports, customize themes. Happy grading!' }
    ];
    
    const step = steps[demoTourStep];
    const isLast = demoTourStep === 10;
    
    // Just highlight, don't click
    if (demoTourStep === 1) {
        const btn = document.querySelector('[data-bs-target="#sectionModal"]');
        if (btn) highlightElement(btn);
    }
    else if (demoTourStep === 2) {
        const input = document.getElementById('sectionNameInput');
        if (input) highlightElement(input);
    }
    else if (demoTourStep === 3) {
        const btn = document.getElementById('saveSection');
        if (btn) highlightElement(btn);
    }
    else if (demoTourStep === 4) {
        const card = document.querySelector('.section-card');
        if (card) highlightElement(card);
    }
    else if (demoTourStep === 5) {
        const btns = document.querySelectorAll('button');
        const rubBtn = Array.from(btns).find(b => b.textContent.trim().includes('Rubrics'));
        if (rubBtn) highlightElement(rubBtn);
    }
    else if (demoTourStep === 6) {
        const saveBtn = document.getElementById('saveRubrics');
        if (saveBtn) highlightElement(saveBtn);
    }
    else if (demoTourStep === 7) {
        const addStudentBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().includes('Add Student'));
        if (addStudentBtn) highlightElement(addStudentBtn);
    }
    else if (demoTourStep === 8) {
        const cell = document.querySelector('.editable-cell');
        if (cell) highlightElement(cell);
    }
    else if (demoTourStep === 9) {
        const attBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().includes('Attendance'));
        if (attBtn) highlightElement(attBtn);
    }
    
    const tooltip = document.createElement('div');
    tooltip.className = 'demo-tooltip';
    tooltip.style.cssText = `
        position:fixed;
        bottom:24px;
        left:50%;
        transform:translateX(-50%);
        background:#1e293b;
        color:#fff;
        border-radius:16px;
        padding:20px 28px;
        max-width:500px;
        width:90%;
        z-index:9999;
        box-shadow:0 10px 40px rgba(0,0,0,0.5);
        animation:slideUp 0.3s ease;
    `;
    const emojis = ['👋','📁','✏️','💾','✅','📊','💾','👥','✏️','📋','🚀'];
    tooltip.innerHTML = `
        <div style="display:flex;align-items:start;gap:14px;">
            <div style="font-size:28px;">${emojis[demoTourStep] || '🎓'}</div>
            <div style="flex:1;">
                <h6 style="font-weight:700;margin:0 0 6px 0;color:#fff;">${step.title}</h6>
                <p style="margin:0 0 12px 0;font-size:13px;color:#cbd5e1;line-height:1.6;">${step.text}</p>
                <div style="display:flex;gap:8px;align-items:center;">
                    <span style="font-size:11px;color:#94a3b8;">${demoTourStep + 1}/11</span>
                    <div style="flex:1;"></div>
                    <button class="btn btn-sm btn-outline-light" onclick="stopDemo()">Skip</button>
                    ${demoTourStep > 0 ? '<button class="btn btn-sm btn-outline-light" onclick="prevDemoStep()">← Back</button>' : ''}
                    <button class="btn btn-sm btn-light" onclick="nextDemoStep()">${isLast ? 'Finish 🎉' : 'Next →'}</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(tooltip);
}

async function nextDemoStep() {
    removeAllHighlights();
    removeDemoElements();
    
    // Execute action for CURRENT step
    if (demoTourStep === 1) {
        const btn = document.querySelector('[data-bs-target="#sectionModal"]');
        if (btn) btn.click();
        await waitForElement('#sectionNameInput');
    }
    else if (demoTourStep === 2) {
        const input = document.getElementById('sectionNameInput');
        if (input) await typeText(input, 'BSIT-3A');
    }
    else if (demoTourStep === 3) {
        const btn = document.getElementById('saveSection');
        if (btn) { btn.click(); }
        await waitForElement('.section-card', 3000);
        await new Promise(r => setTimeout(r, 400));
    }
    else if (demoTourStep === 4) {
        const card = document.querySelector('.section-card');
        if (card) { card.click(); }
        await new Promise(r => setTimeout(r, 500));
    }
    else if (demoTourStep === 5) {
        const btns = document.querySelectorAll('button');
        const rubBtn = Array.from(btns).find(b => b.textContent.trim().includes('Rubrics'));
        if (rubBtn) { rubBtn.click(); }
        await new Promise(r => setTimeout(r, 400));
        const nameInput = document.getElementById('rubricName');
        const weightInput = document.getElementById('rubricWeight');
        const addBtn = document.getElementById('addRubricBtn');
        if (nameInput && weightInput && addBtn) {
            await typeText(nameInput, 'Major Exams', 30);
            weightInput.value = '40';
            addBtn.click();
            await new Promise(r => setTimeout(r, 200));
        }
        if (nameInput && weightInput) {
            await typeText(nameInput, 'Quiz', 30);
            weightInput.value = '30';
            addBtn.click();
            await new Promise(r => setTimeout(r, 200));
        }
        if (nameInput && weightInput) {
            await typeText(nameInput, 'Project', 30);
            weightInput.value = '30';
            addBtn.click();
        }
    }
    else if (demoTourStep === 6) {
        const saveBtn = document.getElementById('saveRubrics');
        if (saveBtn) { saveBtn.click(); }
        await new Promise(r => setTimeout(r, 500));
    }
    else if (demoTourStep === 7) {
        const addStudentBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().includes('Add Student'));
        if (addStudentBtn) { addStudentBtn.click(); }
        await new Promise(r => setTimeout(r, 400));
        const fn = document.getElementById('studentFirstName');
        const ln = document.getElementById('studentLastName');
        const em = document.getElementById('studentEmailInput');
        if (fn) await typeText(fn, 'Juan', 40);
        await new Promise(r => setTimeout(r, 200));
        if (ln) await typeText(ln, 'Dela Cruz', 40);
        await new Promise(r => setTimeout(r, 200));
        if (em) await typeText(em, 'juan@email.com', 30);
        await new Promise(r => setTimeout(r, 400));
        const saveStudentBtn = document.getElementById('saveStudent');
        if (saveStudentBtn) { saveStudentBtn.click(); }
        await new Promise(r => setTimeout(r, 800));
    }
    else if (demoTourStep === 8) {
        const cell = document.querySelector('.editable-cell');
        if (cell) {
            cell.focus();
            cell.textContent = '85';
            cell.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(r => setTimeout(r, 300));
            cell.blur();
        }
        await new Promise(r => setTimeout(r, 500));
    }
    else if (demoTourStep === 9) {
        const attBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().includes('Attendance'));
        if (attBtn) { attBtn.click(); }
    }
    else if (demoTourStep === 10) {
        document.querySelectorAll('.modal').forEach(m => {
            const instance = bootstrap.Modal.getInstance(m);
            if (instance) instance.hide();
        });
    }
    
    demoTourStep++;
    if (demoTourStep >= 11) {
        stopDemo();
        showToast('Demo complete! 🎉 Click ? to replay.', 'success');
    } else {
        showDemoStep();
    }
}

function prevDemoStep() {
    removeAllHighlights();
    removeDemoElements();
    demoTourStep = Math.max(0, demoTourStep - 1);
    showDemoStep();
}

function stopDemo() {
    removeDemoElements();
    removeAllHighlights();
    demoTourStep = 0;
    demoTourActive = false;
    document.querySelectorAll('.modal').forEach(m => {
        const instance = bootstrap.Modal.getInstance(m);
        if (instance) instance.hide();
    });
}

function removeDemoElements() {
    document.querySelectorAll('.demo-tooltip').forEach(el => el.remove());
}

document.getElementById('tutorialBtn').addEventListener('click', startDemo);

// ─── INIT ───
if (window.innerWidth <= 768) {
    sidebar.classList.remove('show');
}
renderSectionsPage();

async function loadCurrentUser() {
    try {
        const res = await fetch('/api/current_user');
        const user = await res.json();
        document.getElementById('currentUserDisplay').textContent = user.display_name || user.username;
    } catch(e) {
        document.getElementById('currentUserDisplay').textContent = 'User';
    }
}
loadCurrentUser();

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('show');
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.classList.remove('active');
    }
});