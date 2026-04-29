const API_URL = 'http://localhost:3000/api/v1';

// DOM Elements
const eventsGrid = document.getElementById('events-grid');
const loginBtn = document.getElementById('nav-login');
const registerBtn = document.getElementById('nav-register');
const dashboardBtn = document.getElementById('nav-dashboard');
const logoutBtn = document.getElementById('nav-logout');

const authModal = document.getElementById('auth-modal');
const registerModal = document.getElementById('register-modal');
const bookingModal = document.getElementById('booking-modal');

const closeAuthModal = document.querySelector('#auth-modal .close-modal');
const closeRegisterModal = document.getElementById('close-register');
const closeBookingModal = document.getElementById('close-booking');

const authForm = document.getElementById('auth-form');
const registerForm = document.getElementById('register-form');
const bookingForm = document.getElementById('booking-form');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('auth-error');
const registerError = document.getElementById('register-error');

const bookingMessage = document.getElementById('booking-message');
const bookingEventTitle = document.getElementById('booking-event-title');

const recoveryModal = document.getElementById('recovery-modal');
const eventDetailsModal = document.getElementById('event-details-modal');

const closeRecoveryModal = document.getElementById('close-recovery');
const closeEventDetailsModal = document.getElementById('close-event-details');

const recoveryForm = document.getElementById('recovery-form');
const recoveryMessage = document.getElementById('recovery-message');

const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');

let allEvents = [];

// State
let token = localStorage.getItem('token');
let currentEventId = null;

// Initialize
function init() {
    updateNav();
    fetchEvents();
    
    searchInput.addEventListener('input', filterEvents);
    categoryFilter.addEventListener('change', filterEvents);
}

// Update Navigation based on Auth State
function updateNav() {
    if (token) {
        loginBtn.classList.add('hidden');
        registerBtn.classList.add('hidden');
        dashboardBtn.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
    } else {
        loginBtn.classList.remove('hidden');
        registerBtn.classList.remove('hidden');
        dashboardBtn.classList.add('hidden');
        logoutBtn.classList.add('hidden');
    }
}

// Fetch Events
async function fetchEvents() {
    try {
        const response = await fetch(`${API_URL}/events`);
        const result = await response.json();

        if (result.success && result.data && result.data.events) {
            allEvents = result.data.events;
            renderEvents(allEvents);
        } else {
            console.error('Failed to fetch events', result);
            eventsGrid.innerHTML = '<p class="error-text">Failed to load events from the server.</p>';
        }
    } catch (error) {
        console.error('Error fetching events:', error);
        eventsGrid.innerHTML = '<p class="error-text">Could not connect to the backend. Is it running?</p>';
    }
}

// Filter Events
function filterEvents() {
    const term = searchInput.value.toLowerCase();
    const cat = categoryFilter.value.toLowerCase();
    const filtered = allEvents.filter(ev => {
        const matchSearch = (ev.title && ev.title.toLowerCase().includes(term)) || (ev.description && ev.description.toLowerCase().includes(term));
        const matchCat = cat === '' || (ev.category && ev.category.toLowerCase() === cat);
        return matchSearch && matchCat;
    });
    renderEvents(filtered);
}

// Render Events
function renderEvents(events) {
    if (!events || events.length === 0) {
        eventsGrid.innerHTML = '<p>No upcoming events found.</p>';
        return;
    }

    eventsGrid.innerHTML = events.map(event => `
        <div class="event-card">
            ${event.image 
                ? `<div style="height: 150px; border-radius: 8px; margin-bottom: 1rem; background-image: url('${event.image}'); background-size: cover; background-position: center;"></div>`
                : `<div style="height: 150px; background: rgba(99, 102, 241, 0.2); border-radius: 8px; margin-bottom: 1rem; display:flex; align-items:center; justify-content:center; color: var(--primary-color);">
                    ${event.category ? event.category.toUpperCase() : 'EVENT'}
                   </div>`
            }
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <h3 class="event-title" style="margin-bottom: 0;">${event.title || 'Untitled Event'}</h3>
                ${event.stats && event.stats.averageRating > 0 ? `<span style="color: #fbbf24; font-size: 0.9rem;">★ ${event.stats.averageRating.toFixed(1)}</span>` : ''}
            </div>
            <span class="event-date">📅 ${new Date(event.startDate || Date.now()).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <p class="event-desc" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${event.description || 'Join us for this amazing event!'}</p>
            <div class="event-footer">
                <span class="event-price">${!event.price || event.price === 0 ? 'Free' : '$' + event.price}</span>
                <button class="btn btn-primary" onclick="openEventDetails('${event._id}')">View Details</button>
            </div>
        </div>
    `).join('');
}

// Open Booking Modal
window.openBookingModal = (id, title) => {
    if (!token) {
        authError.classList.add('hidden');
        authModal.classList.remove('hidden');
        return;
    }
    currentEventId = id;
    bookingEventTitle.textContent = title;
    bookingMessage.classList.add('hidden');
    bookingMessage.className = 'error-text hidden';
    document.getElementById('tickets').value = '1';
    bookingModal.classList.remove('hidden');
};

// Open Event Details
window.openEventDetails = async (id) => {
    const ev = allEvents.find(e => e._id === id);
    if (!ev) return;
    
    currentEventId = id;
    document.getElementById('detail-title').textContent = ev.title || 'Untitled';
    document.getElementById('detail-date').textContent = new Date(ev.startDate).toLocaleDateString();
    document.getElementById('detail-status').textContent = (ev.status || 'Upcoming').toUpperCase();
    document.getElementById('detail-desc').textContent = ev.description || '';
    document.getElementById('detail-category').textContent = ev.category || 'N/A';
    document.getElementById('detail-venue').textContent = (ev.location && ev.location.venue) ? ev.location.venue : 'TBA';
    document.getElementById('detail-price').textContent = (!ev.price || ev.price === 0) ? 'Free' : '$' + ev.price;
    
    document.getElementById('btn-open-booking').onclick = () => {
        eventDetailsModal.classList.add('hidden');
        openBookingModal(id, ev.title);
    };

    const revContainer = document.getElementById('detail-reviews');
    revContainer.innerHTML = '<em>Loading reviews...</em>';
    try {
        const res = await fetch(`${API_URL}/reviews?eventId=${id}`);
        const data = await res.json();
        if (data.success && data.data && data.data.reviews && data.data.reviews.length > 0) {
            revContainer.innerHTML = '<strong>Reviews:</strong><br>' + data.data.reviews.map(r => `
                <div style="background:rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 4px; margin-top:0.5rem; font-size:0.85rem;">
                    <div>Rating: ${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
                    <div>${r.comment || ''}</div>
                </div>
            `).join('');
        } else {
            revContainer.innerHTML = '<em>No reviews yet.</em>';
        }
    } catch(e) {
        revContainer.innerHTML = '<em>Could not load reviews.</em>';
    }

    eventDetailsModal.classList.remove('hidden');
};

// Event Listeners
loginBtn.addEventListener('click', (e) => { e.preventDefault(); authError.classList.add('hidden'); authModal.classList.remove('hidden'); });
registerBtn.addEventListener('click', (e) => { e.preventDefault(); registerError.classList.add('hidden'); registerModal.classList.remove('hidden'); });
document.getElementById('forgot-password-link').addEventListener('click', (e) => {
    e.preventDefault();
    authModal.classList.add('hidden');
    recoveryMessage.classList.add('hidden');
    recoveryModal.classList.remove('hidden');
});

closeAuthModal.addEventListener('click', () => { authModal.classList.add('hidden'); });
closeRegisterModal.addEventListener('click', () => { registerModal.classList.add('hidden'); });
closeBookingModal.addEventListener('click', () => { bookingModal.classList.add('hidden'); });
closeRecoveryModal.addEventListener('click', () => { recoveryModal.classList.add('hidden'); });
closeEventDetailsModal.addEventListener('click', () => { eventDetailsModal.classList.add('hidden'); });

logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    token = null;
    updateNav();
});

// LOGIN
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.classList.add('hidden');
    const submitBtn = authForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Logging in...'; submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput.value, password: passwordInput.value })
        });
        const data = await response.json();

        if (data.success || response.ok) {
            token = data.data?.token || data.token;
            localStorage.setItem('token', token);
            authModal.classList.add('hidden');
            emailInput.value = ''; passwordInput.value = '';
            updateNav();
        } else {
            let msg = data.message || 'Login failed.';
            if (data.errors && Array.isArray(data.errors)) msg = data.errors.map(e => e.message || e).join(', ');
            authError.textContent = msg;
            authError.classList.remove('hidden');
        }
    } catch (error) {
        authError.textContent = 'Connection error.'; authError.classList.remove('hidden');
    } finally {
        submitBtn.textContent = 'Submit'; submitBtn.disabled = false;
    }
});

// REGISTER
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.classList.add('hidden');
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Registering...'; submitBtn.disabled = true;

    try {
        const payload = {
            firstName: document.getElementById('reg-firstName').value,
            lastName: document.getElementById('reg-lastName').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value,
            role: document.getElementById('reg-role').value
        };
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (data.success || response.ok) {
            token = data.data?.token || data.token;
            localStorage.setItem('token', token);
            registerModal.classList.add('hidden');
            registerForm.reset();
            updateNav();
        } else {
            let msg = data.message || 'Registration failed.';
            if (data.errors && Array.isArray(data.errors)) msg = data.errors.map(e => e.message || e).join(', ');
            registerError.textContent = msg;
            registerError.classList.remove('hidden');
        }
    } catch (error) {
        registerError.textContent = 'Connection error.'; registerError.classList.remove('hidden');
    } finally {
        submitBtn.textContent = 'Register'; submitBtn.disabled = false;
    }
});

// BOOK
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tickets = document.getElementById('tickets').value;
    const btn = bookingForm.querySelector('button');
    btn.disabled = true; btn.textContent = 'Booking...';

    try {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ eventId: currentEventId, ticketsCount: Number(tickets) })
        });
        const data = await response.json();

        if (data.success || response.ok) {
            bookingMessage.textContent = 'Booking successful! View it in your Dashboard.';
            bookingMessage.className = 'success-text'; bookingMessage.classList.remove('hidden');
            setTimeout(() => { bookingModal.classList.add('hidden'); }, 2000);
            fetchEvents(); // Refresh capacity
        } else {
            let msg = data.message || 'Booking failed.';
            if (data.errors && Array.isArray(data.errors)) msg = data.errors.map(e => e.message || e).join(', ');
            bookingMessage.textContent = msg;
            bookingMessage.className = 'error-text'; bookingMessage.classList.remove('hidden');
        }
    } catch (error) {
        bookingMessage.textContent = 'Connection error.'; bookingMessage.className = 'error-text'; bookingMessage.classList.remove('hidden');
    } finally {
        btn.disabled = false; btn.textContent = 'Confirm Booking';
    }
});

// RECOVERY
recoveryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = recoveryForm.querySelector('button');
    btn.textContent = 'Sending...'; btn.disabled = true;
    recoveryMessage.classList.add('hidden');
    
    try {
        const res = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: document.getElementById('recovery-email').value })
        });
        const data = await res.json();
        
        if (data.success || res.ok) {
            recoveryMessage.textContent = 'Password reset link sent to your email!';
            recoveryMessage.className = 'success-text';
        } else {
            recoveryMessage.textContent = data.message || 'Failed to send request.';
            recoveryMessage.className = 'error-text';
        }
        recoveryMessage.classList.remove('hidden');
    } catch(e) {
        recoveryMessage.textContent = 'Connection error.';
        recoveryMessage.className = 'error-text';
        recoveryMessage.classList.remove('hidden');
    } finally {
        btn.textContent = 'Send Reset Link'; btn.disabled = false;
    }
});

init();
