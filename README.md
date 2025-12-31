# 🌿 Garden Management System - Backend API

## 📋 Project Overview

The Garden Management System is a comprehensive backend API designed to manage garden maintenance operations, client relationships, task assignments, inventory tracking, and financial management for garden maintenance businesses.

### Core Responsibilities

- **Task Management**: Create, assign, track, and complete garden maintenance tasks
- **Client Management**: Manage client information, properties, and service history
- **Worker Management**: Track worker assignments, performance, and availability
- **Inventory Management**: Monitor garden supplies, materials, and equipment
- **Financial Management**: Generate invoices, track payments, and manage accounting
- **Real-time Notifications**: Email and WhatsApp notifications for task updates
- **Media Management**: Handle task-related images and videos with Cloudinary integration

### High-level System Flow

```
Clients → Create Service Requests → Admin Creates Tasks → Assign to Workers → 
Workers Complete Tasks → Clients Provide Feedback → Generate Invoices → Payment Processing
```

## 🛠️ Tech Stack

### Runtime & Framework
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework for building RESTful APIs
- **ES Modules**: Modern JavaScript module system

### Database
- **MongoDB**: NoSQL database for flexible data storage
- **Mongoose**: ODM (Object Data Modeling) library for MongoDB

### Authentication & Security
- **JWT (JSON Web Tokens)**: Stateless authentication mechanism
- **bcryptjs**: Password hashing for secure storage
- **Helmet**: Security middleware for Express
- **express-mongo-sanitize**: Prevent NoSQL injection attacks
- **xss-clean**: Prevent XSS attacks
- **CORS**: Cross-Origin Resource Sharing configuration

### File Storage & Media
- **Cloudinary**: Cloud-based image and video storage
- **Multer**: Middleware for handling file uploads
- **Sharp**: Image processing library
- **Jimp**: Alternative image processing

### Real-time Communication
- **Socket.io**: WebSocket implementation for real-time updates

### Third-party Services
- **Nodemailer**: Email sending capabilities
- **Twilio**: WhatsApp messaging integration
- **PDFKit**: PDF generation for invoices

### Development & Testing
- **Nodemon**: Development server with auto-restart
- **Jest**: JavaScript testing framework
- **Supertest**: HTTP assertion library

### Monitoring & Logging
- **Morgan**: HTTP request logger
- **Compression**: Response compression middleware

## 📁 Folder Structure

```
backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.js      # MongoDB connection setup
│   │   └── socket.js        # Socket.io configuration
│   │
│   ├── controllers/        # Business logic handlers
│   │   ├── authController.js # Authentication logic
│   │   ├── clientController.js # Client management
│   │   ├── taskController.js  # Task operations
│   │   ├── inventoryController.js # Inventory management
│   │   ├── invoiceController.js # Financial operations
│   │   └── ...              # Other controllers
│   │
│   ├── middleware/         # Express middleware
│   │   ├── auth.js          # Authentication middleware
│   │   ├── errorHandler.js  # Global error handling
│   │   ├── upload.js        # File upload handling
│   │   └── validator.js     # Request validation
│   │
│   ├── models/            # Data models
│   │   ├── User.js         # User model (admin/worker/accountant)
│   │   ├── Client.js        # Client model
│   │   ├── Task.js         # Task model
│   │   ├── Site.js         # Site/Property model
│   │   ├── Inventory.js    # Inventory model
│   │   └── ...            # Other models
│   │
│   ├── routes/            # API routes
│   │   ├── authRoutes.js   # Authentication routes
│   │   ├── clientRoutes.js # Client routes
│   │   ├── taskRoutes.js   # Task routes
│   │   └── ...            # Other routes
│   │
│   ├── services/          # Business services
│   │   ├── emailService.js # Email notifications
│   │   ├── whatsappService.js # WhatsApp notifications
│   │   ├── notificationService.js # Notification logic
│   │   └── ...            # Other services
│   │
│   └── utils/             # Utility functions
│       ├── jwt.js         # JWT token utilities
│       ├── cronJobs.js    # Scheduled jobs
│       └── ...           # Other utilities
│
├── uploads/               # Local file storage
│   ├── images/            # Uploaded images
│   └── invoices/          # Generated invoices
│
├── .env.example           # Environment variables template
├── package.json           # Project dependencies
├── server.js              # Main server entry point
└── README.md              # Project documentation
```

### Layer Responsibilities

1. **Routes Layer**: Defines API endpoints and HTTP methods
2. **Middleware Layer**: Handles authentication, validation, and request processing
3. **Controllers Layer**: Contains business logic and coordinates between services and models
4. **Services Layer**: Implements core business logic and external integrations
5. **Models Layer**: Defines data structure and database interactions
6. **Config Layer**: Manages application configuration

## 🏗️ Architecture & Design Patterns

### MVC Pattern with Service Layer

The application follows a modified MVC (Model-View-Controller) pattern with an additional Service Layer:

- **Models**: Define data structure and database operations
- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic and external integrations
- **Routes**: Define API endpoints

### Separation of Concerns

- **Authentication**: Separate auth middleware and controllers
- **Authorization**: Role-based access control (RBAC)
- **Validation**: Centralized request validation
- **Error Handling**: Global error handling middleware

### Scalability Features

- **Pagination**: All list endpoints support pagination
- **Indexing**: Database indexes for performance optimization
- **Caching**: Potential for Redis caching integration
- **Rate Limiting**: Configurable request rate limiting

### Error Handling

- **Global Error Handler**: Centralized error handling middleware
- **Custom Error Classes**: Specific error types for different scenarios
- **Validation Errors**: Express-validator for request validation
- **Database Errors**: Mongoose error handling

## 🔐 Authentication & Authorization

### Authentication Flow

```
1. User submits credentials (email/password)
2. System validates credentials against database
3. JWT token generated with user ID and role
4. Token returned to client
5. Client includes token in Authorization header for protected routes
6. Middleware validates token and attaches user to request
```

### Middleware

- **protect**: Validates JWT token and authenticates user
- **authorize**: Checks user role permissions
- **optionalAuth**: Optional authentication for public routes
- **accountantOnly**: Special middleware for financial operations

### Role-Based Access Control (RBAC)

- **admin**: Full system access
- **worker**: Task management and assignment access
- **accountant**: Financial and invoice access
- **client**: Limited access to own data and tasks

## 📡 API Documentation

### Authentication Routes

#### Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Method**: POST
- **Purpose**: Authenticate user and return JWT token
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "jwt.token.here",
      "user": { "id": "...", "name": "...", "role": "..." }
    }
  }
  ```

#### Get Current User
- **Endpoint**: `GET /api/v1/auth/me`
- **Method**: GET
- **Purpose**: Get authenticated user details
- **Headers**: `Authorization: Bearer <token>`
- **Response**: User object with populated branch data

### Task Management Routes

#### Get All Tasks
- **Endpoint**: `GET /api/v1/tasks`
- **Method**: GET
- **Purpose**: Retrieve paginated list of tasks
- **Query Params**:
  - `status`, `worker`, `client`, `site`, `section`, `branch`, `priority`, `category`
  - `page=1`, `limit=20`, `sort=-createdAt`
- **Response**: Paginated task list with metadata

#### Create Task
- **Endpoint**: `POST /api/v1/tasks`
- **Method**: POST
- **Purpose**: Create new maintenance task
- **Request Body**: Task details including site, sections, client, worker, materials
- **Response**: Created task object

### Client Management Routes

#### Create Client
- **Endpoint**: `POST /api/v1/clients`
- **Method**: POST
- **Purpose**: Register new client
- **Request Body**: Client details including name, email, phone, address
- **Response**: Created client object

### Inventory Management Routes

#### Get Inventory Items
- **Endpoint**: `GET /api/v1/inventory`
- **Method**: GET
- **Purpose**: Retrieve inventory items with pagination
- **Query Params**: `branch`, `category`, `page`, `limit`
- **Response**: Paginated inventory list

## 🗃️ Database Design

### Collections

1. **Users**: Admin, workers, and accountants
2. **Clients**: Customer information and service history
3. **Tasks**: Maintenance tasks with detailed tracking
4. **Sites**: Client properties and locations
5. **Inventory**: Materials and equipment tracking
6. **Invoices**: Financial records and payment tracking
7. **Notifications**: System notifications and alerts

### Relationships

- **User → Task**: One-to-many (worker assigned to tasks)
- **Client → Task**: One-to-many (client has multiple tasks)
- **Client → Site**: One-to-many (client has multiple properties)
- **Site → Task**: One-to-many (site has multiple tasks)
- **Task → Inventory**: Many-to-many (tasks use inventory items)
- **Task → Invoice**: One-to-one (task generates invoice)

### Indexing Strategy

- **Performance Indexes**: Created on frequently queried fields
- **Unique Indexes**: Email addresses, usernames, invoice numbers
- **Compound Indexes**: Combined fields for complex queries

### Pagination Strategy

- **Standard Pagination**: `page` and `limit` query parameters
- **Cursor-based Pagination**: Potential for large datasets
- **Metadata**: Total count, page count, current page

### Soft Delete

- **Implementation**: `isActive` flag for users, `status` field for other entities
- **Recovery**: Allows data recovery and historical tracking

## 🌍 Environment Variables

### Required Variables

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/garden-management

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
JWT_CLIENT_EXPIRE=24h

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=Garden Management <noreply@garden.com>

# File Upload Configuration
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
USE_CLOUDINARY=false
```

### Variable Explanations

- **NODE_ENV**: Application environment (development/production)
- **MONGODB_URI**: MongoDB connection string
- **JWT_SECRET**: Secret key for JWT token generation
- **FRONTEND_URL**: Allowed CORS origin for frontend
- **EMAIL_***: SMTP configuration for email notifications
- **CLOUDINARY_***: Cloudinary credentials for media storage

## 🚀 Running the Project

### Local Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Create .env file**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Run Tests**:
   ```bash
   npm test
   ```

### Production Build

1. **Build for Production**:
   ```bash
   npm install --production
   ```

2. **Start Production Server**:
   ```bash
   npm start
   ```

3. **Run with Docker**:
   ```bash
   docker-compose up --build
   ```

### Common Issues & Fixes

- **MongoDB Connection Error**: Verify MongoDB is running and URI is correct
- **JWT Verification Failed**: Check JWT_SECRET matches token generation
- **CORS Issues**: Ensure FRONTEND_URL is properly configured
- **Email Not Sending**: Verify SMTP credentials and network connectivity

## ❌ Error Handling & Logging

### Centralized Error Handler

- **Location**: `src/middleware/errorHandler.js`
- **Features**:
  - Mongoose error handling (CastError, ValidationError, DuplicateKey)
  - JWT error handling (JsonWebTokenError, TokenExpiredError)
  - Development stack traces
  - Production error messages

### Validation Strategy

- **Express-Validator**: Request body and parameter validation
- **Custom Validators**: Business rule validation
- **Early Validation**: Fail fast approach

### Logging Tools

- **Morgan**: HTTP request logging
- **Console Logging**: Strategic logging for debugging
- **Error Logging**: Comprehensive error logging

## 🛡️ Security Best Practices

### Authentication Security

- **JWT Tokens**: Secure token generation and validation
- **Password Hashing**: bcryptjs for secure password storage
- **Token Expiration**: Configurable token lifetime

### Data Protection

- **Input Sanitization**: express-mongo-sanitize and xss-clean
- **CORS Configuration**: Restricted origin access
- **Helmet**: Security headers for Express

### Rate Limiting

- **Configurable Limits**: Request rate limiting
- **Whitelist**: Exclude critical endpoints
- **Response Messages**: Clear rate limit exceeded messages

### Sensitive Data

- **Environment Variables**: Never hardcode sensitive data
- **Password Fields**: Excluded from API responses
- **Token Protection**: Secure token storage recommendations

## 🚀 Performance & Scalability

### Pagination Strategy

- **Standard Implementation**: Page-based pagination
- **Query Optimization**: Efficient database queries
- **Metadata**: Complete pagination information

### Caching

- **Potential Integration**: Redis caching layer
- **Query Caching**: Frequent query results
- **Response Caching**: API response caching

### Query Optimization

- **Database Indexes**: Strategic indexing for performance
- **Selective Population**: Only populate needed fields
- **Lean Queries**: Use lean() for read-only operations

### Large Datasets

- **Streaming**: Potential for data streaming
- **Batch Processing**: Large data operations
- **Background Jobs**: Cron jobs for maintenance

## 🔧 Future Development Guide

### Adding a New Module

1. **Create Model**: Define data structure in `src/models/`
2. **Create Controller**: Implement business logic in `src/controllers/`
3. **Create Routes**: Define API endpoints in `src/routes/`
4. **Add to Server**: Import and use routes in `server.js`
5. **Add Validation**: Create validation rules in `src/middleware/validator.js`
6. **Update Documentation**: Add API documentation to README

### Adding a New Protected Route

1. **Import Auth Middleware**:
   ```javascript
   import { protect, authorize } from '../middleware/auth.js';
   ```

2. **Apply Middleware**:
   ```javascript
   router.get('/protected', protect, authorize('admin'), controllerFunction);
   ```

3. **Test Authorization**: Verify role-based access control

### Adding a New Database Entity

1. **Define Schema**: Create new Mongoose model
2. **Create Indexes**: Add appropriate database indexes
3. **Add Relationships**: Define references to other models
4. **Create Validation**: Add model validation rules
5. **Update Seed Data**: Add to database seeding scripts

### Code Quality Guidelines

- **Consistent Naming**: Use camelCase for variables, PascalCase for classes
- **Error Handling**: Always include try-catch blocks
- **Validation**: Validate all inputs and outputs
- **Documentation**: Add JSDoc comments for functions
- **Testing**: Write unit and integration tests

## 🤝 Contribution Guidelines

### Code Style

- **Indentation**: 2 spaces (no tabs)
- **Line Length**: Maximum 100 characters
- **Quotes**: Single quotes for strings
- **Semicolons**: Required at end of statements

### Naming Conventions

- **Variables**: camelCase (e.g., `userId`, `taskStatus`)
- **Functions**: camelCase (e.g., `getUserById`, `createTask`)
- **Files**: kebab-case (e.g., `user-controller.js`)
- **Models**: PascalCase (e.g., `User`, `Task`)

### Commit Message Rules

- **Format**: `<type>(<scope>): <description>`
- **Types**: feat, fix, docs, style, refactor, test, chore
- **Scope**: Module or component affected
- **Description**: Clear, concise explanation of changes

### Examples

```bash
# Good commit messages
git commit -m "feat(auth): add JWT token validation"
git commit -m "fix(task): resolve image upload issue"
git commit -m "docs(readme): update API documentation"
git commit -m "refactor(user): improve model validation"
```

## 📚 Additional Resources

- **API Testing**: Use Postman or Insomnia for API testing
- **Database Management**: MongoDB Compass for database visualization
- **Monitoring**: Consider adding logging and monitoring tools
- **CI/CD**: Implement continuous integration and deployment

## 🎯 Project Goals

- **Reliability**: Stable and consistent API performance
- **Security**: Protect sensitive data and prevent unauthorized access
- **Scalability**: Handle growing user base and data volume
- **Maintainability**: Clean, well-documented codebase
- **Extensibility**: Easy to add new features and modules

## 📞 Support

For issues, questions, or contributions, please contact the development team or submit a pull request.

---

**Last Updated**: 2025-12-31
**Version**: 1.0.0
**Maintainer**: Garden Management Team
