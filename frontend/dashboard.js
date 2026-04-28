const API_URL = 'http://localhost:3000/api/v1';
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'index.html'; // Redirect to login
}

let currentUser = null;

// DOM Elements
const userGreeting = document.getElementById('user-greeting');
const sidebarLinks = document.getElementById('sidebar-links');
const contentLoading = document.getElementById('content-loading');
const profileInfo = document.getElementById('profile-info');

// Views
const views = ['view-profile', 'view-bookings', 'view-my-events', 'view-create-event'];

async function initDashboard() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (!result.success || !result.data?.user) {
            throw new Error('Unauthorized');
        }

        currentUser = result.data.user;
        userGreeting.textContent = `Hello, ${currentUser.firstName}!`;
        renderSidebar();
        showView('view-profile');
        loadProfile();
    } catch (e) {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }
}

function renderSidebar() {
    let linksHTML = `<a onclick="showView('view-profile')">My Profile</a>`;

    if (currentUser.role === 'user') {
        linksHTML += `<a onclick="loadBookings()">My Bookings</a>`;
    } else if (currentUser.role === 'organizer') {
        linksHTML += `<a onclick="loadMyEvents()">My events</a>`;
        linksHTML += `<a onclick="showView('view-create-event')">Create Event</a>`;
    } else if (currentUser.role === 'admin') {
        linksHTML += `<a>Admin Dashboard (Coming Soon)</a>`;
    }

    sidebarLinks.innerHTML = linksHTML;
}

function showView(viewId) {
    views.forEach(v => document.getElementById(v).classList.add('hidden'));
    contentLoading.classList.add('hidden');
    document.getElementById(viewId).classList.remove('hidden');
}

// PROFILE
function loadProfile() {
    profileInfo.innerHTML = `
        <p><strong>Name:</strong> ${currentUser.firstName} ${currentUser.lastName}</p>
        <p><strong>Email:</strong> ${currentUser.email}</p>
        <p><strong>Role:</strong> <span style="text-transform: capitalize;">${currentUser.role}</span></p>
        <p><strong>Status:</strong> ${currentUser.status}</p>
        <p><strong>Joined:</strong> ${new Date(currentUser.createdAt).toLocaleDateString()}</p>
    `;
}

// BOOKINGS
async function loadBookings() {
    showView('view-bookings');
    const tbody = document.getElementById('bookings-table-body');
    tbody.innerHTML = '<tr><td colspan="5">Loading bookings...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/bookings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        const bookings = result.data?.bookings || [];
        if (bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">You have no bookings yet.</td></tr>';
            return;
        }

        tbody.innerHTML = bookings.map(b => `
            <tr>
                <td><strong>${b.event?.title || 'Unknown Event'}</strong></td>
                <td>${b.event ? new Date(b.event.startDate).toLocaleDateString() : 'N/A'}</td>
                <td>${b.ticketsCount}</td>
                <td><span class="status-badge status-${b.status}">${b.status.toUpperCase()}</span></td>
                <td>
                    ${b.status !== 'cancelled' ? `
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="cancelBooking('${b._id}')">Cancel</button>
                    ` : 'Cancelled'}
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5">Failed to load bookings.</td></tr>';
    }
}

window.cancelBooking = async (id) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
        await fetch(`${API_URL}/bookings/${id}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ reason: 'User requested cancellation' })
        });
        loadBookings(); // Refresh list
    } catch (e) {
        alert('Failed to cancel booking.');
    }
};

// MY EVENTS (For Organizer)
async function loadMyEvents() {
    showView('view-my-events');
    const tbody = document.getElementById('my-events-table-body');
    tbody.innerHTML = '<tr><td colspan="4">Loading events...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/events/my-events`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        const events = result.data?.events || [];
        if (events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">You have not created any events yet.</td></tr>';
            return;
        }

        tbody.innerHTML = events.map(e => `
            <tr>
                <td><strong>${e.title}</strong></td>
                <td>${new Date(e.startDate).toLocaleDateString()}</td>
                <td>${e.capacity}</td>
                <td><span class="status-badge status-${e.status}">${e.status.toUpperCase()}</span></td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4">Failed to load events.</td></tr>';
    }
}

// CREATE EVENT (For Organizer)
document.getElementById('create-event-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const msg = document.getElementById('create-event-message');
    btn.disabled = true;
    msg.classList.add('hidden');

    const payload = {
        title: document.getElementById('ev-title').value,
        description: document.getElementById('ev-desc').value,
        category: document.getElementById('ev-category').value,
        price: Number(document.getElementById('ev-price').value),
        capacity: Number(document.getElementById('ev-capacity').value),
        startDate: new Date(document.getElementById('ev-start').value).toISOString(),
        endDate: new Date(document.getElementById('ev-end').value).toISOString(),
        location: { venue: document.getElementById('ev-venue').value }
    };

    try {
        const response = await fetch(`${API_URL}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.success || response.ok) {
            msg.textContent = 'Event Created Successfully!';
            msg.className = 'success-text';
            msg.classList.remove('hidden');
            setTimeout(() => { loadMyEvents(); }, 1500);
            e.target.reset();
        } else {
            let msgText = result.message || 'Failed to create event.';
            if (result.errors && Array.isArray(result.errors)) msgText = result.errors.map(e => e.message || e).join(', ');
            msg.textContent = msgText;
            msg.className = 'error-text'; msg.classList.remove('hidden');
        }
    } catch (err) {
        msg.textContent = 'Connection Error.';
        msg.className = 'error-text'; msg.classList.remove('hidden');
    } finally {
        btn.disabled = false;
    }
});

// Run
initDashboard();
