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
    Object.values(clients).

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
    navLinks.forEach
