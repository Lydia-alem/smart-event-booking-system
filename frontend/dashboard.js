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
const views = ['view-profile', 'view-bookings', 'view-my-events', 'view-create-event', 'view-admin-stats', 'view-admin-events', 'view-admin-users', 'view-admin-reviews'];

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
        linksHTML += `<a onclick="loadAdminStats()">Analytics</a>`;
        linksHTML += `<a onclick="loadAdminEvents()">Approval Queue</a>`;
        linksHTML += `<a onclick="loadAdminUsers()">User Management</a>`;
        linksHTML += `<a onclick="loadAdminReviews()">Review Moderation</a>`;
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
    document.getElementById('prof-first').value = currentUser.firstName;
    document.getElementById('prof-last').value = currentUser.lastName;
}

document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    const msg = document.getElementById('prof-msg');
    
    try {
        const res = await fetch(`${API_URL}/users/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                firstName: document.getElementById('prof-first').value,
                lastName: document.getElementById('prof-last').value
            })
        });
        const data = await res.json();
        if (data.success || res.ok) {
            msg.textContent = 'Profile updated!';
            msg.className = 'success-text';
            msg.classList.remove('hidden');
            currentUser.firstName = document.getElementById('prof-first').value;
            currentUser.lastName = document.getElementById('prof-last').value;
            userGreeting.textContent = `Hello, ${currentUser.firstName}!`;
            loadProfile();
            setTimeout(() => { document.getElementById('edit-profile-form').classList.add('hidden'); msg.classList.add('hidden'); }, 1500);
        } else {
            msg.textContent = data.message || 'Failed to update';
            msg.className = 'error-text';
            msg.classList.remove('hidden');
        }
    } catch(err) {
        msg.textContent = 'Error updating profile';
        msg.className = 'error-text';
        msg.classList.remove('hidden');
    } finally {
        btn.disabled = false;
    }
});

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
                    ${b.status === 'confirmed' ? `
                        <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-left: 0.5rem;" onclick="downloadTicket('${b._id}')">Ticket</button>
                    ` : ''}
                    ${b.status === 'confirmed' ? `
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-left: 0.5rem;" onclick="openReviewModal('${b.event._id}')">Review</button>
                    ` : ''}
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
                <td>
                    <button class="btn btn-outline" style="font-size:0.8rem; padding: 0.25rem 0.5rem; color:#ef4444; border-color:#ef4444;" onclick="deleteEvent('${e._id}')">Delete</button>
                </td>
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

    // Handle image upload to base64
    const fileInput = document.getElementById('ev-image');
    let imageBase64 = null;
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        try {
            imageBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        } catch (err) {
            console.error('Image processing failed', err);
        }
    }

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
    if (imageBase64) {
        payload.image = imageBase64;
    }

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

window.deleteEvent = async (id) => {
    if(!confirm('Are you sure you want to delete this event?')) return;
    try {
        await fetch(`${API_URL}/events/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadMyEvents();
    } catch(e) {
        alert('Failed to delete event');
    }
};

window.downloadTicket = async (id) => {
    try {
        const res = await fetch(`${API_URL}/bookings/${id}/download`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to download');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch(e) {
        alert('Could not download ticket');
    }
};

// Admin Functions
async function loadAdminStats() {
    showView('view-admin-stats');
    try {
        const res = await fetch(`${API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
        const result = await res.json();
        if(result.success && result.data) {
            document.getElementById('stat-users').textContent = result.data.usersCount || 0;
            document.getElementById('stat-events').textContent = result.data.eventsCount || 0;
            document.getElementById('stat-bookings').textContent = result.data.bookingsCount || 0;

            const ctx = document.getElementById('bookingsChart');
            if(ctx && window.Chart) {
                // Remove old chart if exists
                let chartStatus = Chart.getChart("bookingsChart");
                if (chartStatus != undefined) {
                  chartStatus.destroy();
                }
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Users', 'Events', 'Bookings'],
                        datasets: [{
                            label: 'System Overview',
                            data: [result.data.usersCount || 0, result.data.eventsCount || 0, result.data.bookingsCount || 0],
                            backgroundColor: ['rgba(99, 102, 241, 0.5)', 'rgba(16, 185, 129, 0.5)', 'rgba(245, 158, 11, 0.5)']
                        }]
                    }
                });
            }
        }
    } catch(e) { console.error('Failed to load stats'); }
}

async function loadAdminEvents() {
    showView('view-admin-events');
    const tbody = document.getElementById('admin-events-table-body');
    tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    try {
        const res = await fetch(`${API_URL}/admin/events/pending`, { headers: { 'Authorization': `Bearer ${token}` } });
        const result = await res.json();
        const events = result.data?.events || [];
        if(events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No pending events.</td></tr>';
            return;
        }
        tbody.innerHTML = events.map(e => `
            <tr>
                <td>${e.title}</td>
                <td>${e.organizer?.firstName || 'Unknown'}</td>
                <td>${new Date(e.startDate).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-outline" style="font-size:0.8rem; padding: 0.25rem 0.5rem; color:#10b981; border-color:#10b981;" onclick="adminApproveEvent('${e._id}')">Approve</button>
                    <button class="btn btn-outline" style="font-size:0.8rem; padding: 0.25rem 0.5rem; color:#ef4444; border-color:#ef4444; margin-left: 0.5rem;" onclick="adminRejectEvent('${e._id}')">Reject</button>
                </td>
            </tr>
        `).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="4">Error loading events.</td></tr>'; }
}

window.adminApproveEvent = async (id) => {
    try {
        await fetch(`${API_URL}/admin/events/${id}/approve`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
        loadAdminEvents();
    } catch(e) { alert('Failed'); }
}
window.adminRejectEvent = async (id) => {
    try {
        await fetch(`${API_URL}/admin/events/${id}/reject`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
        loadAdminEvents();
    } catch(e) { alert('Failed'); }
}

async function loadAdminUsers() {
    showView('view-admin-users');
    const tbody = document.getElementById('admin-users-table-body');
    tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    try {
        const res = await fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
        const result = await res.json();
        const users = result.data?.users || [];
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.firstName} ${u.lastName}</td>
                <td>${u.email}</td>
                <td>${u.role}</td>
                <td>${u.status}</td>
                <td>
                    ${u.status === 'active' ? `<button class="btn btn-outline" style="font-size:0.8rem; padding:0.25rem 0.5rem; margin-right:0.5rem;" onclick="adminBanUser('${u._id}')">Ban</button>` : `<button class="btn btn-outline" style="font-size:0.8rem; padding:0.25rem 0.5rem; margin-right:0.5rem;" onclick="adminUnbanUser('${u._id}')">Unban</button>`}
                    ${u.role === 'user' ? `<button class="btn btn-primary" style="font-size:0.8rem; padding:0.25rem 0.5rem;" onclick="adminPromoteUser('${u._id}')">Promote</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="5">Error loading users.</td></tr>'; }
}

window.adminBanUser = async (id) => {
    try { await fetch(`${API_URL}/admin/users/${id}/ban`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } }); loadAdminUsers(); } catch(e) { alert('Failed'); }
}
window.adminUnbanUser = async (id) => {
    try { await fetch(`${API_URL}/admin/users/${id}/unban`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } }); loadAdminUsers(); } catch(e) { alert('Failed'); }
}
window.adminPromoteUser = async (id) => {
    try { await fetch(`${API_URL}/admin/users/${id}/promote`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } }); loadAdminUsers(); } catch(e) { alert('Failed'); }
}

// Review System
let reviewEventId = null;
window.openReviewModal = (eventId) => {
    reviewEventId = eventId;
    document.getElementById('review-modal').classList.remove('hidden');
    document.getElementById('review-message').classList.add('hidden');
    document.getElementById('review-form').reset();
};
document.getElementById('close-review').onclick = () => document.getElementById('review-modal').classList.add('hidden');
document.getElementById('review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    const msg = document.getElementById('review-message');
    try {
        const res = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                eventId: reviewEventId,
                rating: Number(document.getElementById('rev-rating').value),
                comment: document.getElementById('rev-comment').value
            })
        });
        const data = await res.json();
        if(data.success || res.ok) {
            msg.textContent = 'Review submitted!';
            msg.className = 'success-text';
            msg.classList.remove('hidden');
            setTimeout(() => document.getElementById('review-modal').classList.add('hidden'), 1500);
        } else {
            msg.textContent = data.message || 'Failed';
            msg.className = 'error-text';
            msg.classList.remove('hidden');
        }
    } catch(e) {
        msg.textContent = 'Error';
        msg.className = 'error-text';
        msg.classList.remove('hidden');
    } finally {
        btn.disabled = false;
    }
});

// Admin Review Moderation
window.loadAdminReviews = async () => {
    showView('view-admin-reviews');
    const tbody = document.getElementById('admin-reviews-table-body');
    tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
    try {
        const res = await fetch(`${API_URL}/admin/reviews`, { headers: { 'Authorization': `Bearer ${token}` } });
        const result = await res.json();
        const reviews = result.data?.reviews || [];
        if(reviews.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No reviews found.</td></tr>';
            return;
        }
        tbody.innerHTML = reviews.map(r => `
            <tr>
                <td>${r.user?.firstName || 'Unknown'} ${r.user?.lastName || ''}</td>
                <td>${r.event?.title || 'Unknown Event'}</td>
                <td>${r.rating} ★</td>
                <td>${r.comment || 'No comment'}</td>
                <td><span class="status-badge status-${r.status}">${r.status}</span></td>
                <td>
                    ${r.status === 'flagged' ? `<button class="btn btn-outline" style="font-size:0.8rem; padding: 0.25rem 0.5rem; color:#10b981; border-color:#10b981;" onclick="adminApproveReview('${r._id}')">Approve</button>` : ''}
                    <button class="btn btn-outline" style="font-size:0.8rem; padding: 0.25rem 0.5rem; color:#ef4444; border-color:#ef4444; margin-left: 0.5rem;" onclick="adminDeleteReview('${r._id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="6">Error loading reviews.</td></tr>'; }
};

window.adminApproveReview = async (id) => {
    try {
        await fetch(`${API_URL}/admin/reviews/${id}/approve`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
        loadAdminReviews();
    } catch(e) { alert('Failed'); }
};

window.adminDeleteReview = async (id) => {
    if(!confirm('Are you sure you want to delete this review?')) return;
    try {
        await fetch(`${API_URL}/admin/reviews/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        loadAdminReviews();
    } catch(e) { alert('Failed'); }
};
