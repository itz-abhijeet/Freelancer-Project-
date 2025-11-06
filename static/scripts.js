// ====================================================================
// JAVASCRIPT LOGIC (Adapted from your provided code to use Fetch API)
// ====================================================================

// Global State Variables
let projects = [];
let currentFilter = 'All';
let clients = []; // Will be populated with available clients

// --- UTILITY FUNCTIONS ---

/** Displays a toast notification. */
window.showToast = (message, type = 'success') => {
    const toastContainer = document.getElementById('toast-container');
    const color = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-accent';

    const toast = document.createElement('div');
    toast.className = `p-4 rounded-lg shadow-xl ${color} text-primary-bg font-semibold transition-opacity duration-300 transform opacity-0 translate-x-10`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.remove('opacity-0', 'translate-x-10');
        toast.classList.add('opacity-100', 'translate-x-0');
    }, 50);

    // Animate out and remove
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-x-0');
        toast.classList.add('opacity-0', 'translate-x-10');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

/** Converts total milliseconds to a human-readable string (e.g., "1h 30m"). */
const formatTime = (ms) => {
    if (ms < 0) return '0h 0m';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
};

// --- MODAL FUNCTIONS ---

/** Opens the project modal for creating or editing. */
window.openModal = (project = null) => {
    document.getElementById('project-form').reset();
    const modal = document.getElementById('project-modal');
    const clientSelect = document.getElementById('client_id');

    // Default select options
    clientSelect.innerHTML = '<option value="">Select Client</option>';
    // {% for client in clients %} are already available in the template scope, but for a real app,
    // you'd fetch this list via AJAX if it were dynamic. Since it's static in the template, we'll use it.

    if (project) {
        document.getElementById('modal-title').textContent = 'Edit Project';
        document.getElementById('project-id').value = project.ProjectID;
        document.getElementById('name').value = project.Name;
        document.getElementById('rateValue').value = project.RateValue;

        // Select rate type radio button
        document.querySelector(`input[name="rateType"][value="${project.RateType}"]`).checked = true;

        // Select client option
        const clientOption = Array.from(clientSelect.options).find(opt => opt.textContent === project.ClientName);
        if (clientOption) {
            clientOption.selected = true;
        }

    } else {
        document.getElementById('modal-title').textContent = 'Add New Project';
        document.getElementById('project-id').value = '';
        document.getElementById('rateTypeHourly').checked = true; // Default to hourly
    }

    // Manually trigger the label update logic
    document.querySelector('.rate-type-toggle').dispatchEvent(new Event('click'));

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

/** Closes the project modal. */
window.closeModal = () => {
    const modal = document.getElementById('project-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

// --- API & DATA FUNCTIONS ---

/** Fetches all project data from the Flask API. */
const fetchProjects = async () => {
    document.getElementById('user-info').textContent = `Loading data from MySQL...`;
    try {
        const response = await fetch('/api/projects');
        const data = await response.json();

        if (response.ok) {
            projects = data; // Update global state
            renderProjects();
        } else {
            showToast(data.error || 'Failed to fetch projects.', 'error');
        }
    } catch (error) {
        console.error("Fetch error:", error);
        showToast('Network error or server is down.', 'error');
    }
    document.getElementById('user-info').textContent = `Data synced with MySQL.`;
};

/** Saves a new project or updates an existing one via API. */
const saveProject = async (e) => {
    e.preventDefault();
    const form = e.target;
    const projectId = document.getElementById('project-id').value;

    const payload = {
        name: document.getElementById('name').value.trim(),
        client_id: document.getElementById('client_id').value,
        rateType: form.querySelector('input[name="rateType"]:checked').value,
        rateValue: parseFloat(document.getElementById('rateValue').value),
    };

    if (!payload.name || !payload.client_id || isNaN(payload.rateValue) || payload.rateValue <= 0) {
        showToast('Please fill in all fields correctly.', 'error');
        return;
    }

    let method = 'POST';
    let url = '/api/projects';
    if (projectId) {
        method = 'POST'; // Flask uses POST for updates in this simple implementation
        payload.id = projectId;
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message);
            closeModal();
            fetchProjects(); // Re-fetch all data to update the UI
        } else {
            showToast(data.error || 'Failed to save project.', 'error');
        }
    } catch (error) {
        showToast('Network error during project save.', 'error');
    }
};

/** Deletes a project by ID via API. */
window.deleteProject = async (projectId) => {
    if (!confirm("Are you sure you want to delete this project and all associated time logs?")) {
        return;
    }

    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'danger');
            fetchProjects(); // Re-fetch all data to update the UI
        } else {
            showToast(data.error || 'Failed to delete project.', 'error');
        }
    } catch (error) {
        showToast('Network error during project delete.', 'error');
    }
};

/**
 * Toggles the timer (Start/Stop) for an hourly project via API.
 * @param {number} projectId - The ID of the project.
 */
window.toggleTimer = async (projectId) => {
    try {
        const response = await fetch(`/api/timer/${projectId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message);
            fetchProjects(); // Re-fetch to update timer status and total time
        } else {
            showToast(data.error || 'Failed to toggle timer.', 'error');
        }
    } catch (error) {
        showToast('Network error during timer toggle.', 'error');
    }
};

/** Updates the project status via API. */
window.updateStatus = async (projectId, newStatus) => {
    try {
        const response = await fetch(`/api/projects/${projectId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message);
            fetchProjects(); // Re-fetch to update status
        } else {
            showToast(data.error || 'Failed to update status.', 'error');
        }
    } catch (error) {
        showToast('Network error during status update.', 'error');
    }
};

// --- RENDERING FUNCTIONS ---

/** Renders the top summary cards. */
const renderSummary = (currentProjects) => {
    let totalPendingEarnings = 0;
    let totalActiveTimeMs = 0;

    // Python handles the calculation, we just need to sum up the values here
    currentProjects.forEach(p => {
        // Remove '₹' and parse the due amount (e.g., "₹500.00" -> 500.00)
        const due = parseFloat(p.TotalDue.replace('₹', ''));

        if (p.Status !== 'Paid') {
            totalPendingEarnings += due;
        }

        // Only sum time for hourly projects with running timer
        if (p.isTimerRunning) {
            // We can't accurately sum running time without Python logic
            // For the summary card, we will just count the projects.
        }
    });

    // To update the total time accurately, we would need the raw total_ms from the backend.
    // Since we only get the formatted string, we'll rely on the backend calculation.
    // For the sake of having a number here, we'll just count the projects.
    const totalHours = currentProjects.filter(p => p.isTimerRunning).length;

    document.getElementById('total-pending').textContent = `₹${totalPendingEarnings.toFixed(2)}`;

    // The time summary card must be re-calculated in the backend or updated in the frontend periodically.
    // Since the backend only sends total formatted time, let's just show running projects count for simplicity.
    document.getElementById('total-time-logged').textContent = `${totalHours} Running Timer(s)`;

    document.getElementById('total-projects-count').textContent = currentProjects.length;
};

/** Renders the list of projects to the table. */
const renderProjects = () => {
    renderSummary(projects); // Update summary cards

    const projectsListElement = document.getElementById('projects-list');
    projectsListElement.innerHTML = '';

    const filteredProjects = projects.filter(p => {
        if (currentFilter === 'All') return true;
        if (currentFilter === 'Hourly') return p.RateType === 'Hourly';
        return p.Status === currentFilter;
    });

    if (filteredProjects.length === 0) {
        projectsListElement.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-500">No projects found with status: ${currentFilter}</td></tr>`;
        return;
    }

    filteredProjects.forEach(project => {
        const totalDue = project.TotalDue;
        const totalTimeLogged = project.TotalTimeLogged;
        const isTimerRunning = project.isTimerRunning;

        let statusColor = '';
        switch (project.Status) {
            case 'Active': statusColor = 'bg-accent/20 text-accent'; break;
            case 'Invoiced': statusColor = 'bg-yellow-400/20 text-yellow-400'; break;
            case 'Paid': statusColor = 'bg-success/20 text-success'; break;
        }

        const row = document.createElement('tr');
        row.className = 'hover:bg-secondary-bg transition duration-150';

        // Helper for mobile data-label
        const td = (content, label) => `<td class="py-4 px-2" data-label="${label}">${content}</td>`;

        // Prepare object for edit button
        const projectForEdit = {
            ProjectID: project.ProjectID,
            Name: project.Name,
            ClientName: project.ClientName,
            RateType: project.RateType,
            RateValue: project.RateValue
        };

        let actionButtons = `<button onclick='openModal(${JSON.stringify(projectForEdit).replace(/'/g, "\\'")})' class="text-slate-400 hover:text-accent mr-2 transition" title="Edit Project">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5l4 4L7.5 19.5 3 21l1.5-4.5L16.5 3.5z"/></svg>
                            </button>
                            <button onclick="deleteProject('${project.ProjectID}')" class="text-slate-400 hover:text-danger mr-2 transition" title="Delete Project">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>`;

        if (project.Status === 'Active') {
            if (project.RateType === 'Hourly') {
                const btnClass = isTimerRunning ? 'bg-danger hover:bg-red-500' : 'bg-success hover:bg-green-500';
                const btnIcon = isTimerRunning ?
                    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>` :
                    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

                actionButtons += `<button onclick="toggleTimer('${project.ProjectID}')" class="${btnClass} text-primary-bg px-3 py-1 rounded-lg font-semibold transition flex items-center justify-center space-x-1 mr-2" title="${isTimerRunning ? 'Stop Timer' : 'Start Timer'}">${btnIcon}</button>`;
            }
            actionButtons += `<button onclick="updateStatus('${project.ProjectID}', 'Invoiced')" class="bg-yellow-400 text-white px-3 py-1 rounded-lg font-semibold hover:bg-yellow-500 transition" title="Mark Invoiced">Invoice</button>`;
        } else if (project.Status === 'Invoiced') {
            actionButtons += `<button onclick="updateStatus('${project.ProjectID}', 'Paid')" class="bg-success text-white px-3 py-1 rounded-lg font-semibold hover:bg-green-500 transition" title="Mark Paid">Paid</button>`;
        } else if (project.Status === 'Paid') {
            actionButtons += '<span class="text-success font-medium">Completed</span>';
        }

        row.innerHTML = `
            ${td(`<div>${project.Name}</div><div class="text-slate-400 text-sm">${project.ClientName}</div>`, 'Project / Client')}
            ${td(`<div>₹${project.RateValue.toFixed(2)}</div><div class="text-slate-400 text-sm">${project.RateType}</div>`, 'Rate')}
            ${td(`<span class="font-bold text-lg text-accent">${totalDue}</span>`, 'Total Due')}
            ${td(totalTimeLogged, 'Time Logged')}
            ${td(`<span class="px-3 py-1 text-xs rounded-full ${statusColor} font-medium">${project.Status}</span>`, 'Status')}
            ${td(`<div class="flex items-center justify-end md:justify-start space-x-1">${actionButtons}</div>`, 'Actions')}
        `;

        projectsListElement.appendChild(row);
    });
};

/** Handles filter button clicks. */
const handleFilterClick = (e) => {
    let target = e.target;
    // Traverse up to find the closest element with the filter-btn class
    while (target && !target.classList.contains('filter-btn')) {
        target = target.parentElement;
    }
    if (!target) return;

    // Remove active class from all
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-accent', 'text-white');
        btn.classList.add('hover:bg-gray-100');
    });

    // Add active class to clicked button (or its parent)
    target.classList.add('bg-accent', 'text-white');
    target.classList.remove('hover:bg-gray-100');

    currentFilter = target.getAttribute('data-filter') || 'All';
    renderProjects(); // Re-render with new filter
};

/** Handles rate type change to update the input label. */
const handleRateTypeChange = (e) => {
    if(e.target.name === 'rateType') {
        const label = document.getElementById('rateValueLabel');
        label.textContent = e.target.value === 'Hourly' ? 'Hourly Rate (₹/hr)' : 'Fixed Price (₹)';
    }
};

// --- INITIALIZATION ---

/** Starts the application. */
const loadInitialData = () => {
    // Set initial user info
    document.getElementById('user-info').textContent = `Data synced with MySQL. Please visit /setup_db first!`;

    // Start fetching data and set interval to update running timers
    fetchProjects();

    // Set interval to update running timers (only re-renders if timer is active)
    setInterval(fetchProjects, 5000);
};

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    loadInitialData(); // Start the app

    // Modal/Form handlers
    document.getElementById('add-project-btn').addEventListener('click', () => openModal());
    document.getElementById('project-form').addEventListener('submit', saveProject);
    document.getElementById('project-modal').addEventListener('click', (e) => {
        // Allows clicking outside the modal to close it
        if (e.target.id === 'project-modal') closeModal();
    });

    // Summary/Filter handlers
    document.getElementById('summary-cards').addEventListener('click', handleFilterClick);

    // Rate type handler in modal
    document.querySelector('.rate-type-toggle').addEventListener('change', handleRateTypeChange);

    // Initialize filter button style
    document.querySelector('[data-filter="All"]').classList.add('bg-accent', 'text-white');
});
