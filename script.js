const firebaseConfig = {
  apiKey: "AIzaSyDSoHJ4M8-vyDm8-msZG2cxthfK6zRzOV4",
  authDomain: "bingsearchmanager.firebaseapp.com",
  databaseURL: "https://bingsearchmanager-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bingsearchmanager",
  storageBucket: "bingsearchmanager.firebasestorage.app",
  messagingSenderId: "688318974542",
  appId: "1:688318974542:web:81caafcee21c2d729b511f"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Simple admin password - CHANGE THIS to your own password
const ADMIN_PASSWORD = "Rahul000";

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const togglePasswordBtn = document.getElementById('toggle-password');
const sidebarToggle = document.getElementById('sidebar-toggle');
const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
const sidebar = document.querySelector('.sidebar');
const mainContent = document.querySelector('.main-content');
const navLinks = document.querySelectorAll('.nav-link[data-page]');
const contentPages = document.querySelectorAll('.content-page');
const pageTitle = document.getElementById('page-title');
const themeSwitch = document.getElementById('theme-switch');
const logoutBtn = document.getElementById('logout-btn');

// Global variables
let refreshInterval;
let clients = {};
let searchTerms = [];
let activityLog = [];
let selectedClientId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
        showDashboard();
    }

    // Set up event listeners
    setupEventListeners();
    
    // Initialize charts if logged in
    if (isLoggedIn) {
        initializeCharts();
        startDataRefresh();
    }
});

// Set up event listeners
function setupEventListeners() {
    // Login form
    loginBtn.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    togglePasswordBtn.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePasswordBtn.innerHTML = type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
    });
    
    // Sidebar toggle
    sidebarToggle.addEventListener('click', toggleSidebar);
    mobileSidebarToggle.addEventListener('click', toggleMobileSidebar);
    
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            const targetPage = this.getAttribute('data-page');
            changePage(targetPage);
        });
    });
    
    // Theme toggle
    themeSwitch.addEventListener('change', toggleTheme);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Client actions
    document.getElementById('pause-all-btn').addEventListener('click', pauseAllClients);
    document.getElementById('resume-all-btn').addEventListener('click', resumeAllClients);
    document.getElementById('reset-all-btn').addEventListener('click', resetAllClients);
    document.getElementById('update-max-searches-btn').addEventListener('click', updateGlobalMaxSearches);
    
    // Search terms actions
    document.getElementById('add-term-btn').addEventListener('click', addSearchTerm);
    document.getElementById('add-bulk-terms-btn').addEventListener('click', addBulkSearchTerms);
    document.getElementById('import-terms-btn').addEventListener('click', importSearchTerms);
    document.getElementById('export-terms-btn').addEventListener('click', exportSearchTerms);
    document.getElementById('delete-selected-terms-btn').addEventListener('click', deleteSelectedTerms);
    
    // Client details modal actions
    document.getElementById('detail-update-max').addEventListener('click', updateClientMaxSearches);
    document.getElementById('detail-pause-btn').addEventListener('click', pauseSelectedClient);
    document.getElementById('detail-resume-btn').addEventListener('click', resumeSelectedClient);
    document.getElementById('detail-reset-btn').addEventListener('click', resetSelectedClient);
    document.getElementById('detail-disable-btn').addEventListener('click', toggleDisableClient);
}

// Handle login
function handleLogin() {
    const password = passwordInput.value;
    
    if (password === ADMIN_PASSWORD) {
        localStorage.setItem('isLoggedIn', 'true');
        showDashboard();
        initializeCharts();
        startDataRefresh();
    } else {
        alert('Incorrect password. Please try again.');
        passwordInput.value = '';
    }
}

// Show dashboard
function showDashboard() {
    loginContainer.classList.add('d-none');
    dashboardContainer.classList.remove('d-none');
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('isLoggedIn');
    stopDataRefresh();
    dashboardContainer.classList.add('d-none');
    loginContainer.classList.remove('d-none');
    passwordInput.value = '';
}

// Toggle sidebar
function toggleSidebar() {
    sidebar.classList.toggle('sidebar-collapsed');
    mainContent.classList.toggle('main-content-expanded');
}

// Toggle mobile sidebar
function toggleMobileSidebar() {
    sidebar.classList.toggle('sidebar-visible');
}

// Change page
function changePage(pageName) {
    // Update navigation
    navLinks.forEach(link => {
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Update content pages
    contentPages.forEach(page => {
        if (page.id === `${pageName}-page`) {
            page.classList.add('active');
        } else {
            page.classList.remove('active');
        }
    });
    
    // Update page title
    pageTitle.textContent = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    
    // Close mobile sidebar if open
    if (window.innerWidth < 992) {
        sidebar.classList.remove('sidebar-visible');
    }
}

// Toggle theme
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-theme'));
}

// Start data refresh
function startDataRefresh() {
    // Initial data load
    loadData();
    
    // Set up refresh interval
    const refreshRate = parseInt(document.getElementById('refresh-interval').value) || 10000;
    refreshInterval = setInterval(loadData, refreshRate);
    
    // Update refresh interval when changed
    document.getElementById('refresh-interval').addEventListener('change', function() {
        clearInterval(refreshInterval);
        const newRate = parseInt(this.value) || 10000;
        refreshInterval = setInterval(loadData, newRate);
    });
}

// Stop data refresh
function stopDataRefresh() {
    clearInterval(refreshInterval);
}

// Load data from Firebase
function loadData() {
    // Load clients
    database.ref('clients').once('value')
        .then(snapshot => {
            clients = snapshot.val() || {};
            updateClientsUI();
            updateDashboardStats();
        })
        .catch(error => {
            console.error("Error loading clients:", error);
        });
    
    // Load search terms
    database.ref('searchTerms').once('value')
        .then(snapshot => {
            searchTerms = snapshot.val() || [];
            updateSearchTermsUI();
            updateDashboardStats();
        })
        .catch(error => {
            console.error("Error loading search terms:", error);
        });
    
    // Load activity log
    database.ref('activityLog').orderByChild('timestamp').limitToLast(20).once('value')
        .then(snapshot => {
            activityLog = [];
            snapshot.forEach(childSnapshot => {
                activityLog.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            activityLog.reverse();
            updateActivityLogUI();
        })
        .catch(error => {
            console.error("Error loading activity log:", error);
        });
}

// Update clients UI
function updateClientsUI() {
    const tableBody = document.getElementById('clients-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!clients || Object.keys(clients).length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No clients connected</td>
            </tr>
        `;
        return;
    }
    
    Object.keys(clients).forEach(clientId => {
        const client = clients[clientId];
        const status = client.status || {};
        const commands = client.commands || {};
        
        // Skip if client is disabled and not showing disabled
        if (commands.disabled && !document.getElementById('show-disabled-clients')?.checked) {
            return;
        }
        
        const lastActive = status.lastActive ? new Date(status.lastActive) : null;
        const timeAgo = lastActive ? getTimeAgo(lastActive) : 'Never';
        const isActive = lastActive && (Date.now() - lastActive) < 5 * 60 * 1000; // 5 minutes
        
        const statusClass = commands.disabled ? 'danger' :
                           status.status === 'Paused' ? 'warning' :
                           isActive ? 'success' : 'secondary';
        
        const statusText = commands.disabled ? 'Disabled' :
                          status.status || (isActive ? 'Active' : 'Inactive');
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${clientId}</td>
            <td><span class="badge bg-${statusClass}">${statusText}</span></td>
            <td>${status.mode || 'Unknown'}</td>
            <td>${status.searchCount || 0}/${status.maxSearches || '?'}</td>
            <td>${timeAgo}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary view-client-btn" data-client-id="${clientId}">
                    <i class="bi bi-info-circle"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning pause-client-btn" data-client-id="${clientId}" ${commands.disabled ? 'disabled' : ''}>
                    <i class="bi bi-pause-fill"></i>
                </button>
                <button class="btn btn-sm btn-outline-success resume-client-btn" data-client-id="${clientId}" ${commands.disabled ? 'disabled' : ''}>
                    <i class="bi bi-play-fill"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger reset-client-btn" data-client-id="${clientId}" ${commands.disabled ? 'disabled' : ''}>
                    <i class="bi bi-arrow-repeat"></i>
                </button>
                <button class="btn btn-sm btn-outline-${commands.disabled ? 'success' : 'dark'} toggle-disable-btn" data-client-id="${clientId}">
                    <i class="bi bi-${commands.disabled ? 'power' : 'power'}"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.view-client-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const clientId = this.getAttribute('data-client-id');
            openClientDetailsModal(clientId);
        });
    });
    
    document.querySelectorAll('.pause-client-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const clientId = this.getAttribute('data-client-id');
            pauseClient(clientId);
        });
    });
    
    document.querySelectorAll('.resume-client-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const clientId = this.getAttribute('data-client-id');
            resumeClient(clientId);
        });
    });
    
    document.querySelectorAll('.reset-client-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const clientId = this.getAttribute('data-client-id');
            resetClient(clientId);
        });
    });
    
    document.querySelectorAll('.toggle-disable-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const clientId = this.getAttribute('data-client-id');
            toggleClientDisabled(clientId);
        });
    });
}

// Update search terms UI
function updateSearchTermsUI() {
    const tableBody = document.getElementById('search-terms-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!searchTerms || searchTerms.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No search terms available</td>
            </tr>
        `;
        return;
    }
    
    searchTerms.forEach((term, index) => {
        let termText = term;
        let category = 'General';
        let usageCount = 0;
        
        // If term is an object with metadata
        if (typeof term === 'object' && term !== null) {
            termText = term.text || 'Unknown';
            category = term.category || 'General';
            usageCount = term.usageCount || 0;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="form-check">
                    <input class="form-check-input term-checkbox" type="checkbox" data-index="${index}">
                </div>
            </td>
            <td>${termText}</td>
            <td><span class="badge bg-info">${category}</span></td>
            <td>${usageCount}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary edit-term-btn" data-index="${index}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-term-btn" data-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.edit-term-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            editSearchTerm(index);
        });
    });
    
    document.querySelectorAll('.delete-term-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            deleteSearchTerm(index);
        });
    });
    
    // Add event listener to select all checkbox
    document.getElementById('select-all-terms')?.addEventListener('change', function() {
        document.querySelectorAll('.term-checkbox').forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });
}

// Update activity log UI
function updateActivityLogUI() {
    const activityList = document.getElementById('recent-activity-list');
    if (!activityList) return;
    
    activityList.innerHTML = '';
    
    if (!activityLog || activityLog.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon bg-secondary">
                    <i class="bi bi-info-circle"></i>
                </div>
                <div class="activity-details">
                    <h6>No recent activity</h6>
                    <p>Activity will appear here as clients perform actions</p>
                </div>
            </div>
        `;
        return;
    }
    
    activityLog.slice(0, 5).forEach(activity => {
        const timeAgo = getTimeAgo(new Date(activity.timestamp));
        
        let iconClass = 'info';
        let iconName = 'info-circle';
        
        switch (activity.type) {
            case 'client_connected':
                iconClass = 'primary';
                iconName = 'person-plus';
                break;
            case 'search_completed':
                iconClass = 'success';
                iconName = 'check-circle';
                break;
            case 'captcha_detected':
                iconClass = 'warning';
                iconName = 'exclamation-triangle';
                break;
            case 'client_error':
                iconClass = 'danger';
                iconName = 'x-circle';
                break;
            case 'client_disabled':
                iconClass = 'danger';
                iconName = 'power';
                break;
            case 'client_enabled':
                iconClass = 'success';
                iconName = 'power';
                break;
        }
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-icon bg-${iconClass}">
                <i class="bi bi-${iconName}"></i>
            </div>
            <div class="activity-details">
                <h6>${activity.title}</h6>
                <p>${activity.description}</p>
                <small class="text-muted">${timeAgo}</small>
            </div>
        `;
        
        activityList.appendChild(activityItem);
    });
}

// Update dashboard statistics
function updateDashboardStats() {
    // Count active clients
    const activeClients = Object.values(clients).filter(client => {
        const status = client.status || {};
        const lastActive = status.lastActive ? new Date(status.lastActive) : null;
        return lastActive && (Date.now() - lastActive) < 5 * 60 * 1000; // 5 minutes
    }).length;
    
    document.getElementById('active-clients-count').textContent = activeClients;
    
      // Count total searches today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let totalSearches = 0;
    Object.values(clients).forEach(client => {
        const status = client.status || {};
        totalSearches += status.searchCount || 0;
    });
    
    document.getElementById('total-searches-count').textContent = totalSearches;
    
    // Count search terms
    document.getElementById('search-terms-count').textContent = searchTerms.length;
    
    // Calculate uptime
    const startTime = localStorage.getItem('systemStartTime');
    if (!startTime) {
        localStorage.setItem('systemStartTime', Date.now().toString());
    }
    
    const uptimeMs = Date.now() - parseInt(startTime || Date.now());
    const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
    document.getElementById('uptime-value').textContent = `${uptimeHours}h`;
    
    // Update charts
    updateCharts();
}

// Initialize charts
function initializeCharts() {
    // Activity chart
    const activityCtx = document.getElementById('activity-chart');
    if (activityCtx) {
        window.activityChart = new Chart(activityCtx, {
            type: 'line',
            data: {
                labels: Array(24).fill(0).map((_, i) => `${i}:00`),
                datasets: [{
                    label: 'Searches',
                    data: Array(24).fill(0),
                    borderColor: '#4361ee',
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 12
                        }
                    }
                }
            }
        });
    }
    
    // Device chart
    const deviceCtx = document.getElementById('device-chart');
    if (deviceCtx) {
        window.deviceChart = new Chart(deviceCtx, {
            type: 'doughnut',
            data: {
                labels: ['Desktop', 'Mobile'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#4361ee', '#f72585'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            }
        });
    }
}

// Update charts with current data
function updateCharts() {
    // Update activity chart
    if (window.activityChart) {
        // Generate hourly data
        const hourlyData = Array(24).fill(0);
        
        activityLog.forEach(activity => {
            if (activity.type === 'search_completed') {
                const hour = new Date(activity.timestamp).getHours();
                hourlyData[hour]++;
            }
        });
        
        window.activityChart.data.datasets[0].data = hourlyData;
        window.activityChart.update();
    }
    
    // Update device chart
    if (window.deviceChart) {
        let desktopCount = 0;
        let mobileCount = 0;
        
        Object.values(clients).forEach(client => {
            const status = client.status || {};
            if (status.mode === 'Desktop') {
                desktopCount++;
            } else if (status.mode === 'Mobile') {
                mobileCount++;
            }
        });
        
        window.deviceChart.data.datasets[0].data = [desktopCount, mobileCount];
        window.deviceChart.update();
    }
}

// Client Actions
function pauseAllClients() {
    if (!confirm('Are you sure you want to pause all clients?')) return;
    
    Object.keys(clients).forEach(clientId => {
        const commands = clients[clientId].commands || {};
        if (!commands.disabled) {
            pauseClient(clientId);
        }
    });
    
    logActivity('admin_action', 'All Clients Paused', 'Administrator paused all active clients');
}

function resumeAllClients() {
    if (!confirm('Are you sure you want to resume all clients?')) return;
    
    Object.keys(clients).forEach(clientId => {
        const commands = clients[clientId].commands || {};
        if (!commands.disabled) {
            resumeClient(clientId);
        }
    });
    
    logActivity('admin_action', 'All Clients Resumed', 'Administrator resumed all paused clients');
}

function resetAllClients() {
    if (!confirm('Are you sure you want to reset all clients? This will restart their search sessions.')) return;
    
    Object.keys(clients).forEach(clientId => {
        const commands = clients[clientId].commands || {};
        if (!commands.disabled) {
            resetClient(clientId);
        }
    });
    
    logActivity('admin_action', 'All Clients Reset', 'Administrator reset all clients');
}

function updateGlobalMaxSearches() {
    const maxSearches = parseInt(document.getElementById('global-max-searches').value);
    if (isNaN(maxSearches) || maxSearches < 1) {
        alert('Please enter a valid number for max searches');
        return;
    }
    
    Object.keys(clients).forEach(clientId => {
        database.ref(`clients/${clientId}/commands/maxSearches`).set(maxSearches);
    });
    
    logActivity('admin_action', 'Global Max Searches Updated', `Administrator set max searches to ${maxSearches} for all clients`);
}

function pauseClient(clientId) {
    database.ref(`clients/${clientId}/commands/pause`).set(true)
        .then(() => {
            logActivity('client_paused', 'Client Paused', `Client ${clientId} was paused`);
        })
        .catch(error => {
            console.error(`Error pausing client ${clientId}:`, error);
        });
}

function resumeClient(clientId) {
    database.ref(`clients/${clientId}/commands/resume`).set(true)
        .then(() => {
            logActivity('client_resumed', 'Client Resumed', `Client ${clientId} was resumed`);
        })
        .catch(error => {
            console.error(`Error resuming client ${clientId}:`, error);
        });
}

function resetClient(clientId) {
    database.ref(`clients/${clientId}/commands/reset`).set(true)
        .then(() => {
            logActivity('client_reset', 'Client Reset', `Client ${clientId} was reset`);
        })
        .catch(error => {
            console.error(`Error resetting client ${clientId}:`, error);
        });
}

function toggleClientDisabled(clientId) {
    const client = clients[clientId] || {};
    const commands = client.commands || {};
    const isCurrentlyDisabled = commands.disabled || false;
    
    database.ref(`clients/${clientId}/commands/disabled`).set(!isCurrentlyDisabled)
        .then(() => {
            logActivity(
                isCurrentlyDisabled ? 'client_enabled' : 'client_disabled',
                isCurrentlyDisabled ? 'Client Enabled' : 'Client Disabled',
                `Client ${clientId} was ${isCurrentlyDisabled ? 'enabled' : 'disabled'}`
            );
        })
        .catch(error => {
            console.error(`Error toggling disabled state for client ${clientId}:`, error);
        });
}

// Search Term Actions
function addSearchTerm() {
    const termInput = document.getElementById('new-term');
    const categorySelect = document.getElementById('term-category');
    
    const term = termInput.value.trim();
    const category = categorySelect.value;
    
    if (!term) {
        alert('Please enter a search term');
        return;
    }
    
    // Check if term already exists
    const termExists = searchTerms.some(existingTerm => {
        if (typeof existingTerm === 'string') {
            return existingTerm.toLowerCase() === term.toLowerCase();
        } else if (existingTerm && existingTerm.text) {
            return existingTerm.text.toLowerCase() === term.toLowerCase();
        }
        return false;
    });
    
    if (termExists) {
        alert('This search term already exists');
        return;
    }
    
    // Add term with metadata
    const newTerm = {
        text: term,
        category: category,
        usageCount: 0,
        addedAt: Date.now()
    };
    
    const updatedTerms = [...searchTerms, newTerm];
    
    database.ref('searchTerms').set(updatedTerms)
        .then(() => {
            termInput.value = '';
            logActivity('term_added', 'Search Term Added', `New search term "${term}" was added`);
            loadData(); // Refresh data
        })
        .catch(error => {
            console.error('Error adding search term:', error);
            alert('Failed to add search term. Please try again.');
        });
}

function addBulkSearchTerms() {
    const termsTextarea = document.getElementById('bulk-terms');
    const categorySelect = document.getElementById('bulk-category');
    
    const termsText = termsTextarea.value.trim();
    const category = categorySelect.value;
    
    if (!termsText) {
        alert('Please enter search terms');
        return;
    }
    
    const terms = termsText.split('\n')
        .map(term => term.trim())
        .filter(term => term.length > 0);
    
    if (terms.length === 0) {
        alert('No valid search terms found');
        return;
    }
    
    // Filter out duplicates
    const existingTermTexts = searchTerms.map(term => {
        return typeof term === 'string' ? term.toLowerCase() : (term.text ? term.text.toLowerCase() : '');
    });
    
    const newTerms = terms.filter(term => !existingTermTexts.includes(term.toLowerCase()))
        .map(term => ({
            text: term,
            category: category,
            usageCount: 0,
            addedAt: Date.now()
        }));
    
    if (newTerms.length === 0) {
        alert('All terms already exist in the database');
        return;
    }
    
    const updatedTerms = [...searchTerms, ...newTerms];
    
    database.ref('searchTerms').set(updatedTerms)
        .then(() => {
            termsTextarea.value = '';
            logActivity('terms_added', 'Bulk Search Terms Added', `${newTerms.length} new search terms were added`);
            loadData(); // Refresh data
        })
        .catch(error => {
            console.error('Error adding bulk search terms:', error);
            alert('Failed to add search terms. Please try again.');
        });
}

function editSearchTerm(index) {
    const term = searchTerms[index];
    if (!term) return;
    
    const termText = typeof term === 'string' ? term : term.text;
    const category = typeof term === 'string' ? 'General' : (term.category || 'General');
    
    const newText = prompt('Edit search term:', termText);
    if (newText === null) return; // User cancelled
    
    if (newText.trim() === '') {
        alert('Search term cannot be empty');
        return;
    }
    
    // Update term
    const updatedTerms = [...searchTerms];
    
    if (typeof term === 'string') {
        updatedTerms[index] = {
            text: newText.trim(),
            category: category,
            usageCount: 0,
            addedAt: Date.now(),
            editedAt: Date.now()
        };
    } else {
        updatedTerms[index] = {
            ...term,
            text: newText.trim(),
            editedAt: Date.now()
        };
    }
    
    database.ref('searchTerms').set(updatedTerms)
        .then(() => {
            logActivity('term_edited', 'Search Term Edited', `Search term was edited from "${termText}" to "${newText.trim()}"`);
            loadData(); // Refresh data
        })
        .catch(error => {
            console.error('Error editing search term:', error);
            alert('Failed to edit search term. Please try again.');
        });
}

function deleteSearchTerm(index) {
    const term = searchTerms[index];
    if (!term) return;
    
    const termText = typeof term === 'string' ? term : term.text;
    
    if (!confirm(`Are you sure you want to delete the search term "${termText}"?`)) {
        return;
    }
    
    const updatedTerms = searchTerms.filter((_, i) => i !== index);
    
    database.ref('searchTerms').set(updatedTerms)
        .then(() => {
            logActivity('term_deleted', 'Search Term Deleted', `Search term "${termText}" was deleted`);
            loadData(); // Refresh data
        })
        .catch(error => {
            console.error('Error deleting search term:', error);
            alert('Failed to delete search term. Please try again.');
        });
}

function deleteSelectedTerms() {
    const selectedIndexes = [];
    document.querySelectorAll('.term-checkbox:checked').forEach(checkbox => {
        selectedIndexes.push(parseInt(checkbox.getAttribute('data-index')));
    });
    
    if (selectedIndexes.length === 0) {
        alert('No search terms selected');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedIndexes.length} search terms?`)) {
        return;
    }
    
    const updatedTerms = searchTerms.filter((_, index) => !selectedIndexes.includes(index));
    
    database.ref('searchTerms').set(updatedTerms)
        .then(() => {
            logActivity('terms_deleted', 'Search Terms Deleted', `${selectedIndexes.length} search terms were deleted`);
            loadData(); // Refresh data
        })
        .catch(error => {
            console.error('Error deleting search terms:', error);
            alert('Failed to delete search terms. Please try again.');
        });
}

function importSearchTerms() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt';
    
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = event => {
            try {
                let importedTerms = [];
                
                if (file.name.endsWith('.json')) {
                    // Parse JSON file
                    importedTerms = JSON.parse(event.target.result);
                } else {
                    // Parse text file (one term per line)
                    importedTerms = event.target.result.split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 0)
                        .map(term => ({
                            text: term,
                            category: 'Imported',
                            usageCount: 0,
                            addedAt: Date.now()
                        }));
                }
                
                if (!Array.isArray(importedTerms) || importedTerms.length === 0) {
                    alert('No valid search terms found in the file');
                    return;
                }
                
                // Filter out duplicates
                const existingTermTexts = searchTerms.map(term => {
                    return typeof term === 'string' ? term.toLowerCase() : (term.text ? term.text.toLowerCase() : '');
                });
                
                const newTerms = importedTerms.filter(term => {
                    const termText = typeof term === 'string' ? term.toLowerCase() : (term.text ? term.text.toLowerCase() : '');
                    return termText && !existingTermTexts.includes(termText);
                });
                
                if (newTerms.length === 0) {
                    alert('All terms in the file already exist in the database');
                    return;
                }
                
                // Normalize terms to objects if they're strings
                const normalizedNewTerms = newTerms.map(term => {
                    if (typeof term === 'string') {
                        return {
                            text: term,
                            category: 'Imported',
                            usageCount: 0,
                            addedAt: Date.now()
                        };
                    }
                    return {
                        ...term,
                        addedAt: Date.now()
                    };
                });
                
                const updatedTerms = [...searchTerms, ...normalizedNewTerms];
                
                database.ref('searchTerms').set(updatedTerms)
                    .then(() => {
                        logActivity('terms_imported', 'Search Terms Imported', `${normalizedNewTerms.length} search terms were imported`);
                        loadData(); // Refresh data
                        alert(`Successfully imported ${normalizedNewTerms.length} search terms`);
                    })
                    .catch(error => {
                        console.error('Error importing search terms:', error);
                        alert('Failed to import search terms. Please try again.');
                    });
                
            } catch (error) {
                console.error('Error parsing imported file:', error);
                alert('Failed to parse the file. Please make sure it\'s a valid JSON or text file.');
            }
        };
        
        if (file.name.endsWith('.json')) {
            reader.readAsText(file);
        } else {
            reader.readAsText(file);
        }
    };
    
    input.click();
}

      function exportSearchTerms() {
    if (!searchTerms || searchTerms.length === 0) {
        alert('No search terms to export');
        return;
    };
    
    // Create a normalized version of the terms (all as objects)
    const normalizedTerms = searchTerms.map(term => {
        if (typeof term === 'string') {
            return {
                text: term,
                category: 'General',
                usageCount: 0
            };
        }
        return term;
    });
    
    // Create JSON data
    const jsonData = JSON.stringify(normalizedTerms, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `search_terms_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logActivity('terms_exported', 'Search Terms Exported', `${normalizedTerms.length} search terms were exported`);
}

// Client Details Modal
function openClientDetailsModal(clientId) {
    selectedClientId = clientId;
    const client = clients[clientId];
    if (!client) return;
    
    const status = client.status || {};
    const commands = client.commands || {};
    
    // Fill in client details
    document.getElementById('detail-client-id').value = clientId;
    document.getElementById('detail-status').value = commands.disabled ? 'Disabled' : (status.status || 'Unknown');
    document.getElementById('detail-device').value = status.mode || 'Unknown';
    document.getElementById('detail-last-active').value = status.lastActive ? new Date(status.lastActive).toLocaleString() : 'Never';
    document.getElementById('detail-searches').value = `${status.searchCount || 0} / ${status.maxSearches || '?'}`;
    document.getElementById('detail-max-searches').value = status.maxSearches || 30;
    document.getElementById('detail-user-agent').value = status.userAgent || 'Unknown';
    
    // Update button states
    document.getElementById('detail-pause-btn').disabled = commands.disabled;
    document.getElementById('detail-resume-btn').disabled = commands.disabled;
    document.getElementById('detail-reset-btn').disabled = commands.disabled;
    
    const disableBtn = document.getElementById('detail-disable-btn');
    disableBtn.textContent = commands.disabled ? 'Enable' : 'Disable';
    disableBtn.classList.toggle('btn-success', commands.disabled);
    disableBtn.classList.toggle('btn-dark', !commands.disabled);
    
    // Load search history
    loadClientSearchHistory(clientId);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('clientDetailsModal'));
    modal.show();
}

function loadClientSearchHistory(clientId) {
    const historyTable = document.getElementById('detail-search-history');
    historyTable.innerHTML = '<tr><td colspan="3" class="text-center">Loading search history...</td></tr>';
    
    database.ref(`clients/${clientId}/searchHistory`).orderByChild('timestamp').limitToLast(10).once('value')
        .then(snapshot => {
            const history = [];
            snapshot.forEach(childSnapshot => {
                history.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            if (history.length === 0) {
                historyTable.innerHTML = '<tr><td colspan="3" class="text-center">No search history available</td></tr>';
                return;
            }
            
            historyTable.innerHTML = '';
            history.reverse().forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(item.timestamp).toLocaleString()}</td>
                    <td>${item.term || 'Unknown'}</td>
                    <td><span class="badge bg-${item.status === 'completed' ? 'success' : 'secondary'}">${item.status || 'Unknown'}</span></td>
                `;
                historyTable.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading client search history:', error);
            historyTable.innerHTML = '<tr><td colspan="3" class="text-center">Error loading search history</td></tr>';
        });
}

function updateClientMaxSearches() {
    if (!selectedClientId) return;
    
    const maxSearches = parseInt(document.getElementById('detail-max-searches').value);
    if (isNaN(maxSearches) || maxSearches < 1) {
        alert('Please enter a valid number for max searches');
        return;
    }
    
    database.ref(`clients/${selectedClientId}/commands/maxSearches`).set(maxSearches)
        .then(() => {
            logActivity('client_max_searches', 'Client Max Searches Updated', `Max searches for client ${selectedClientId} set to ${maxSearches}`);
            alert('Max searches updated successfully');
        })
        .catch(error => {
            console.error('Error updating max searches:', error);
            alert('Failed to update max searches. Please try again.');
        });
}

function pauseSelectedClient() {
    if (!selectedClientId) return;
    pauseClient(selectedClientId);
}

function resumeSelectedClient() {
    if (!selectedClientId) return;
    resumeClient(selectedClientId);
}

function resetSelectedClient() {
    if (!selectedClientId) return;
    resetClient(selectedClientId);
}

function toggleDisableClient() {
    if (!selectedClientId) return;
    toggleClientDisabled(selectedClientId);
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('clientDetailsModal'));
    modal.hide();
}

// Utility Functions
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + ' years ago';
    
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + ' months ago';
    
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + ' days ago';
    
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + ' hours ago';
    
    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + ' minutes ago';
    
    return Math.floor(seconds) + ' seconds ago';
}

function logActivity(type, title, description) {
    const activity = {
        type,
        title,
        description,
        timestamp: Date.now()
    };
    
    database.ref('activityLog').push(activity)
        .catch(error => {
            console.error('Error logging activity:', error);
        });
}

// Initialize theme based on saved preference
if (localStorage.getItem('darkMode') === 'true' || localStorage.getItem('darkMode') === null) {
    document.body.classList.add('dark-theme');
    document.getElementById('theme-switch').checked = true;
} else {
    document.body.classList.remove('dark-theme');
    document.getElementById('theme-switch').checked = false;
}
