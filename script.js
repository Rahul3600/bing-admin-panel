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
const loginSection = document.getElementById('login-section');
const adminPanel = document.getElementById('admin-panel');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const clientsTable = document.getElementById('clients-table');
const searchTermsInput = document.getElementById('search-terms');
const updateTermsBtn = document.getElementById('update-terms-btn');
const pauseAllBtn = document.getElementById('pause-all-btn');
const resumeAllBtn = document.getElementById('resume-all-btn');
const resetAllBtn = document.getElementById('reset-all-btn');

// Login functionality
loginBtn.addEventListener('click', function() {
    if (passwordInput.value === ADMIN_PASSWORD) {
        loginSection.style.display = 'none';
        adminPanel.style.display = 'block';
        loadData();
    } else {
        alert('Incorrect password!');
    }
});

// Load data from Firebase
function loadData() {
    // Load clients
    database.ref('clients').on('value', snapshot => {
        const clients = snapshot.val() || {};
        updateClientsTable(clients);
    });
    
    // Load search terms
    database.ref('searchTerms').once('value', snapshot => {
        const terms = snapshot.val() || [];
        searchTermsInput.value = Array.isArray(terms) ? terms.join('\n') : '';
    });
}

// Update clients table
function updateClientsTable(clients) {
    if (Object.keys(clients).length === 0) {
        clientsTable.innerHTML = '<tr><td colspan="5" class="text-center">No active clients</td></tr>';
        return;
    }
    
    let tableHTML = '';
    
    Object.keys(clients).forEach(clientId => {
        const client = clients[clientId];
        const status = client.status || {};
        const lastActive = status.lastActive ? new Date(status.lastActive).toLocaleString() : 'Never';
        
        tableHTML += `
            <tr>
                <td>${clientId}</td>
                <td>${status.status || 'Unknown'}</td>
                <td>${status.searchCount || 0}</td>
                <td>${lastActive}</td>
                <td>
                    <button class="btn btn-sm btn-warning me-1" onclick="sendCommand('${clientId}', 'pause')">Pause</button>
                    <button class="btn btn-sm btn-success me-1" onclick="sendCommand('${clientId}', 'resume')">Resume</button>
                    <button class="btn btn-sm btn-danger" onclick="sendCommand('${clientId}', 'reset')">Reset</button>
                </td>
            </tr>
        `;
    });
    
    clientsTable.innerHTML = tableHTML;
}

// Send command to a client
function sendCommand(clientId, command) {
    const commands = {};
    commands[command] = true;
    database.ref(`clients/${clientId}/commands`).set(commands);
    alert(`Sent ${command} command to client ${clientId}`);
}

// Update search terms
updateTermsBtn.addEventListener('click', function() {
    const terms = searchTermsInput.value.split('\n').filter(term => term.trim() !== '');
    
    if (terms.length > 0) {
        database.ref('searchTerms').set(terms);
        alert(`Updated ${terms.length} search terms`);
    } else {
        alert('Please enter at least one search term');
    }
});

// Global commands
pauseAllBtn.addEventListener('click', function() {
    database.ref('clients').once('value', snapshot => {
        const clients = snapshot.val() || {};
        Object.keys(clients).forEach(clientId => {
            sendCommand(clientId, 'pause');
        });
    });
});

resumeAllBtn.addEventListener('click', function() {
    database.ref('clients').once('value', snapshot => {
        const clients = snapshot.val() || {};
        Object.keys(clients).forEach(clientId => {
            sendCommand(clientId, 'resume');
        });
    });
});

resetAllBtn.addEventListener('click', function() {
    database.ref('clients').once('value', snapshot => {
        const clients = snapshot.val() || {};
        Object.keys(clients).forEach(clientId => {
            sendCommand(clientId, 'reset');
        });
    });
});
