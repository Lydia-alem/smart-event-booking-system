/**
 * Swagger Documentation Configuration
 * API documentation using OpenAPI/Swagger
 *
 * REST PRINCIPLES APPLIED:
 * - Documentation: Clear API documentation (Best Practice #4)
 * - Discoverability: Self-documenting API through Swagger UI
 * - Standard format: OpenAPI 3.0 specification
 */
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Event Booking System API',
      version: '1.0.0',
      description: `
REST API for the Smart Event Booking System (SEBS).

## Key REST Principles Applied:

### 1. Resource-Based URLs
- \`/api/v1/events\` - Event resources
- \`/api/v1/bookings\` - Booking resources
- \`/api/v1/users\` - User resources
- \`/api/v1/reviews\` - Review resources

### 2. HTTP Verbs
- **GET** - Retrieve resources (safe, idempotent)
- **POST** - Create new resources
- **PUT** - Update existing resources
- **DELETE** - Remove resources

### 3. Proper Status Codes
- **200** - OK (successful read/update)
- **201** - Created (successful creation)
- **400** - Bad Request (validation error)
- **401** - Unauthorized (missing/invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found (resource doesn't exist)
- **409** - Conflict (duplicate/validation conflict)
- **500** - Internal Server Error

### 4. Stateless
- JWT authentication in Authorization header
- No session storage on server
- Each request is independent

## Authentication
Include JWT token in Authorization header:
\`\`\`
Authorization: Bearer <your_token_here>
\`\`\`
      `,
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['user', 'organizer', 'admin'] },
            status: { type: 'string', enum: ['active', 'banned'] },
            phone: { type: 'string' },
            avatar: { type: 'string' },
            bio: { type: 'string' },
            organizationName: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Event: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            location: {
              type: 'object',
              properties: {
                venue: { type: 'string' },
                address: { type: 'object' },
                isOnline: { type: 'boolean' }
              }
            },
            capacity: { type: 'integer' },
            availableTickets: { type: 'integer' },
            price: { type: 'number' },
            status: { type: 'string' },
            organizer: { type: 'string' }
          }
        },
        Booking: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            event: { type: 'string' },
            ticketsCount: { type: 'integer' },
            totalPrice: { type: 'number' },
            status: { type: 'string' },
            ticketCode: { type: 'string' }
          }
        },
        Review: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            event: { type: 'string' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            comment: { type: 'string' },
            isVerifiedAttendance: { type: 'boolean' },
            helpfulVotes: { type: 'integer' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            currentPage: { type: 'integer' },
            totalPages: { type: 'integer' },
            totalItems: { type: 'integer' },
            hasMore: { type: 'boolean' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger UI
 * @param {Express app} app
 */
const swaggerDocs = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SEBS API Documentation'
  }));

  // Swagger JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('API Documentation available at: http://localhost:3000/api-docs');
};

module.exports = swaggerDocs;