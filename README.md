# Smart Event Booking System (SEBS) - REST API

A comprehensive REST API built with Node.js, Express, and MongoDB for event booking management.

## Project Overview

This project demonstrates backend concepts including:
- **RESTful API design** using proper HTTP methods and status codes
- **Authentication/Authorization** using JWT tokens
- **Data modeling** with MongoDB (Mongoose ODM)
- **File uploads** using Multer
- **Email notifications** using Nodemailer
- **PDF generation** using PDFKit
- **Layered architecture** (routes → controllers → services → models)

---

## REST API Explanation

### What is REST?

**REST (Representational State Transfer)** is an architectural style defined by Roy Fielding in his doctoral dissertation. It describes how web services should communicate, leveraging existing HTTP protocols.

### Key REST Principles Applied in This Project:

#### 1. Resource-Based URLs

Every resource is identified by a unique URI:

```
/api/v1/events          → All events collection
/api/v1/events/:id      → Single event resource
/api/v1/bookings        → All bookings collection
/api/v1/users/profile   → Current user's profile
```

**Principle**: URLs should identify resources, not actions.

❌ BAD: `/api/v1/getEvents` or `/api/v1/deleteEvent?id=5`
✅ GOOD: `GET /api/v1/events/5` and `DELETE /api/v1/events/5`

#### 2. HTTP Verbs (CRUD Operations)

Each HTTP method has specific semantics:

| Verb   | Operation | Safe? | Idempotent? | Status Code |
|--------|-----------|-------|-------------|-------------|
| GET    | Read      | ✅    | ✅          | 200         |
| POST   | Create    | ❌    | ❌          | 201         |
| PUT    | Update    | ❌    | ✅          | 200         |
| DELETE | Delete    | ❌    | ✅          | 200/204     |

**Examples from this project:**

```javascript
// User Module
POST   /api/v1/auth/register    → Create new user (201 Created)
POST   /api/v1/auth/login       → Authenticate user (200 OK)
GET    /api/v1/users/profile    → Get current user (200 OK)
PUT    /api/v1/users/profile    → Update profile (200 OK)

// Event Module
GET    /api/v1/events           → List all events (200 OK)
GET    /api/v1/events/:id       → Get single event (200 OK)
POST   /api/v1/events           → Create event (201 Created)
PUT    /api/v1/events/:id       → Update event (200 OK)
DELETE /api/v1/events/:id        → Delete event (200 OK)
```

#### 3. Proper HTTP Status Codes

Response status codes communicate the result:

**Success Codes:**
- `200 OK` - Request succeeded (GET, PUT)
- `201 Created` - Resource created (POST)
- `204 No Content` - Success with no body (DELETE)

**Client Error Codes:**
- `400 Bad Request` - Validation error, malformed request
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Authenticated but insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Duplicate resource or conflict

**Server Error Codes:**
- `500 Internal Server Error` - Unexpected server error

#### 4. Stateless Communication

Each request contains all information needed:
- **No sessions stored on server**
- **JWT token sent in every request** via Authorization header
- **Server validates token on each request**

```javascript
// Every request includes token
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Benefits:**
- Scalability (any server can handle any request)
- Reliability (requests are independent)
- Simplicity (no server-side session management)

#### 5. Layered Architecture

Request flows through layers:

```
Request → Routes → Middleware → Controller → Service → Model → Database
          ↓
Response ← JSON Response ← Controller ← Service ← Model
```

**Layers:**
1. **Routes** - URL mapping to controllers
2. **Middleware** - Auth, validation, error handling
3. **Controllers** - Request/response handling
4. **Services** - Business logic
5. **Models** - Database schema

#### 6. Resource Representation

Resources are represented in JSON format:

```json
// GET /api/v1/events/123
{
  "success": true,
  "data": {
    "_id": "123",
    "title": "Tech Conference 2024",
    "category": "conference",
    "startDate": "2024-06-15T09:00:00Z",
    "price": 99.99,
    "organizer": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

#### 7. Richardson Maturity Model (Levels)

This project implements **Level 2 (HTTP Verbs + Status Codes)**:

| Level | Description | Our Implementation |
|-------|-------------|-------------------|
| Level 0 | Single endpoint, XML payloads | ❌ |
| Level 1 | Multiple resources | ✅ |
| Level 2 | HTTP verbs + proper status codes | ✅ |
| Level 3 | HATEOAS (hypermedia links) | Partial |

---

## Project Structure

```
smart-event-booking-system/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── event.controller.js
│   │   ├── booking.controller.js
│   │   ├── review.controller.js
│   │   └── admin.controller.js
│   ├── middleware/      # Express middleware
│   │   ├── auth.js          # JWT authentication
│   │   ├── roles.js         # RBAC (Role-based access)
│   │   ├── validators.js    # Input validation
│   │   └── errorHandler.js  # Global error handler
│   ├── models/          # MongoDB schemas
│   │   ├── User.js
│   │   ├── Event.js
│   │   ├── Booking.js
│   │   ├── Review.js
│   │   └── index.js
│   ├── routes/         # API routes
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── event.routes.js
│   │   ├── booking.routes.js
│   │   ├── review.routes.js
│   │   ├── admin.routes.js
│   │   └── index.js
│   ├── services/       # Business logic
│   │   ├── emailService.js
│   │   ├── pdfService.js
│   │   └── uploadService.js
│   ├── utils/          # Utilities
│   │   └── swagger.js
│   └── server.js       # Application entry point
├── .env.example
├── package.json
└── README.md
```

---

## API Endpoints Summary

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /register | Register new user | Public |
| POST | /login | Login user | Public |
| GET | /me | Get current user | Required |
| POST | /logout | Logout | Required |
| POST | /forgot-password | Request password reset | Public |
| POST | /reset-password | Reset password | Public |

### Users (`/api/v1/users`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /profile | Get my profile | Required |
| PUT | /profile | Update profile | Required |
| PUT | /password | Change password | Required |
| DELETE | /account | Delete account | Required |

### Events (`/api/v1/events`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | / | List all events | Public |
| GET | /my-events | My created events | Organizer |
| GET | /:id | Get event details | Public |
| POST | / | Create event | Organizer |
| PUT | /:id | Update event | Owner/Admin |
| DELETE | /:id | Delete event | Owner/Admin |

### Bookings (`/api/v1/bookings`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | / | List my bookings | Required |
| GET | /:id | Get booking details | Owner/Admin |
| POST | / | Create booking | Required |
| POST | /:id/cancel | Cancel booking | Owner |
| GET | /:id/ticket | Get ticket info | Owner/Admin |

### Reviews (`/api/v1/reviews`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | / | List reviews | Public |
| GET | /:id | Get review | Public |
| POST | / | Create review | Required |
| PUT | /:id | Update review | Owner |
| DELETE | /:id | Delete review | Owner/Admin |
| POST | /:id/helpful | Mark helpful | Required |

### Admin (`/api/v1/admin`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /stats | Dashboard stats | Admin |
| GET | /users | List all users | Admin |
| PUT | /users/:id/ban | Ban user | Admin |
| PUT | /users/:id/unban | Unban user | Admin |
| PUT | /users/:id/promote | Promote to organizer | Admin |
| GET | /events/pending | Pending events | Admin |
| PUT | /events/:id/approve | Approve event | Admin |
| PUT | /events/:id/reject | Reject event | Admin |

---

## Homework Requirements (What the Teacher Wants)

Based on the course PDF, your homework should demonstrate:

### 1. REST Architecture Implementation ✅

**What to show:**
- Resource-based URLs (not `/getUsers`, use `GET /users`)
- HTTP verbs mapping to CRUD operations
- Stateless communication with JWT

**Code example:**
```javascript
// ✅ CORRECT - RESTful
router.get('/events', eventController.getEvents);
router.post('/events', eventController.createEvent);
router.put('/events/:id', eventController.updateEvent);
router.delete('/events/:id', eventController.deleteEvent);

// ❌ WRONG - Not RESTful
router.get('/getEvents', eventController.getEvents);
router.get('/deleteEvent', eventController.deleteEvent);
```

### 2. Richardson Maturity Model ✅

**Level 0 (❌):** Don't use single endpoint with XML/JSON action payloads

**Level 1 (✅):** Use multiple resources
```javascript
router.get('/events', ...);
router.get('/users', ...);
```

**Level 2 (✅):** Use HTTP verbs properly
```javascript
// POST creates, GET reads, PUT updates, DELETE removes
// Return appropriate status codes: 200, 201, 400, 401, 403, 404
```

**Level 3 (Optional):** HATEOAS - add links in responses

### 3. Security Best Practices ✅

**Authentication:**
```javascript
// Use JWT tokens in Authorization header
Authorization: Bearer <token>
```

**Authorization:**
```javascript
// Role-based access control
const isAdmin = require('./middleware/roles').isAdmin;
router.delete('/users/:id', auth, isAdmin, userController.deleteUser);
```

**Input Validation:**
```javascript
// Validate all inputs
const { body, validationResult } = require('express-validator');
body('email').isEmail().withMessage('Invalid email');
```

### 4. Documentation ✅

**Use Swagger:**
- Access at: `http://localhost:3000/api-docs`
- Auto-generated from route comments

**Example documentation in routes:**
```javascript
/**
 * @route   GET /api/v1/events
 * @desc    Get all events
 * @access  Public
 * @query   page, limit, category, search
 */
router.get('/', eventController.getEvents);
```

### 5. Error Handling ✅

**Proper status codes:**
```javascript
// Success
res.status(200).json({ success: true, data: events });
res.status(201).json({ success: true, data: newEvent });

// Client errors
res.status(400).json({ success: false, message: 'Validation error' });
res.status(401).json({ success: false, message: 'Unauthorized' });
res.status(404).json({ success: false, message: 'Not found' });

// Server errors
res.status(500).json({ success: false, message: 'Server error' });
```

### 6. Testing ✅

**Tools mentioned in course:**
- Postman for API testing
- Jest for unit tests
- Supertest for integration tests

**Example test:**
```javascript
// test/auth.test.js
const request = require('supertest');
const app = require('../src/server');

describe('Auth API', () => {
  test('POST /auth/register - should create user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
```

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- MongoDB 6+
- npm or yarn

### Setup

```bash
# 1. Clone or create project
cd smart-event-booking-system

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Edit .env with your settings
# - Set MongoDB URI
# - Set JWT_SECRET
# - Configure SMTP for emails (optional)

# 5. Start MongoDB (if local)
mongod

# 6. Run the server
npm run dev    # Development mode
# or
npm start      # Production mode
```

### Access Points

- **API Base URL:** `http://localhost:3000/api/v1`
- **Swagger Docs:** `http://localhost:3000/api-docs`
- **Health Check:** `http://localhost:3000/health`

---

## Testing with Postman

### 1. Register a user
```http
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### 2. Login
```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### 3. Use token in subsequent requests
```http
GET http://localhost:3000/api/v1/users/profile
Authorization: Bearer <your_token_here>
```

---

## Key Files Explained

### How REST is Applied in Each File

#### `src/server.js`
- Central entry point
- Routes mounted at `/api/v1/...`
- Swagger docs at `/api-docs`

#### `src/models/*.js`
- Mongoose schemas define resource structure
- Each model = one resource type

#### `src/routes/*.routes.js`
- Define resource endpoints
- Map HTTP methods to controller functions
- Include documentation comments

#### `src/controllers/*.controller.js`
- Handle HTTP requests/responses
- Return proper status codes
- Call services for business logic

#### `src/middleware/auth.js`
- Extract and verify JWT from Authorization header
- Attach user to request

#### `src/middleware/roles.js`
- Check user roles for authorization
- Return 403 if insufficient permissions

---

## Additional Resources

- [REST API Design Best Practices](https://restfulapi.net/)
- [HTTP Status Codes Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [Richardson Maturity Model](https://martinfowler.com/articles/richardsonMaturityModel.html)

---

## License

MIT License - Free to use for educational purposes