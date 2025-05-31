# Project Analysis and Understanding

## 1. Technology Stack

### Core Languages and Frameworks

- **Language**: TypeScript/JavaScript
- **Frontend Framework**: React 19
- **Routing**: React Router 7
- **CSS Framework**: Tailwind CSS (with shadcn/ui component system)

### Backend and Database

- **Database**: PostgreSQL (via Prisma ORM)
- **Cache**: Redis (for progress tracking and upload status)
- **File Storage**: MinIO (S3-compatible object storage)

### Key Packages

- **ORM**: Prisma 6
- **UI Components**: shadcn/ui (based on Radix UI)
- **State Management**: Zustand + React Query
- **Animation**: Framer Motion
- **Charts**: Recharts
- **Form Handling**: Conform + Zod
- **Authentication**: Custom auth + Google OAuth
- **AI Integration**: OpenAI API, Google AI (Gemini)
- **File Processing**: AWS SDK (S3)
- **Real-time**: Server-Sent Events (SSE)

### Containerization

- Docker & Docker Compose (for development and production)

## 2. Directory Structure and File Purposes

### Main Directories

- **/app**: Main application code
  - **/components**: React components
    - **/ui**: Base UI components (shadcn/ui)
    - **/grading**: Grading-related components
    - **/navbar**: Navigation components
    - **/sidebar**: Sidebar components
    - **/landing**: Landing page components
  - **/routes**: React Router routes and pages
  - **/services**: Service layer (API calls, data processing)
  - **/lib**: Utility libraries
  - **/types**: TypeScript type definitions
  - **/config**: Application configuration
  - **/utils**: Utility functions
  - **/stores**: State management (Zustand stores)
  - **/hooks**: Custom React hooks
  - **/middleware**: Request/response middleware
  - **/schemas**: Zod validation schemas
  - **/constants**: Application constants

- **/prisma**: Prisma ORM related files
  - **/migrations**: Database migration records
  - **schema.prisma**: Database model definitions

### Important Files

- **docker-compose.dev.yaml**: Development container services
- **docker-compose.prod.yaml**: Production container services
- **Dockerfile**: Production container build
- **Dockerfile.dev**: Development container build
- **package.json**: Project dependencies
- **tailwind.config.ts**: Tailwind CSS configuration
- **vite.config.ts**: Vite build tool configuration
- **tsconfig.json**: TypeScript configuration
- **react-router.config.ts**: React Router configuration

## 3. Core Features and Logic

### Core Features

1. **AI-Assisted Grading System**
   - Document upload (PDF, DOCX)
   - Content analysis
   - Application of grading criteria
   - Detailed feedback generation

2. **Grading Criteria Management**
   - Create, edit, manage grading criteria
   - Set grading items and weights
   - Apply criteria to document grading

3. **User Management**
   - Registration/login system
   - Third-party login integration (Google)
   - User permission management

4. **Document Processing**
   - Document upload with progress tracking
   - Document storage and management
   - Content analysis and extraction

### Core Logic

1. **Grading Flow**:
   - Document upload → Content analysis → Apply grading criteria → Generate feedback → Display results

2. **AI Processing Flow**:
   - Document content understanding via OpenAI/Gemini API
   - AI model evaluation based on grading criteria
   - Processing and formatting AI responses into structured feedback

3. **Progress Tracking**:
   - Redis for storing upload and grading progress
   - Real-time updates via Server-Sent Events (SSE)

## 4. Module/Component Interactions

### Data Flow

1. **Frontend to Backend**:
   - React Query for data fetching and caching
   - Server-Sent Events (SSE) for real-time updates
   - Form submissions via Conform

### Key Module Interactions

1. **UI Components and Business Logic**:
   - State management via Zustand stores
   - React Query for server state
   - Custom hooks for shared logic

2. **Grading Service and AI Integration**:
   - Service layer encapsulation of API calls
   - Error handling and retry mechanisms
   - Result formatting and transformation

3. **File Processing and Storage**:
   - Upload progress tracking with real-time updates
   - File analysis and content extraction
   - Permanent storage via MinIO/S3

## 5. Project Architecture and Development Logic Summary

This is an AI-assisted educational grading system built with React Router 7, using a modern React full-stack architecture. Core functionality revolves around document upload, AI analysis, grading criteria application, and result feedback.

The system architecture follows clear separation of concerns:

- **UI Layer**: React components, built with shadcn/ui
- **Routing Layer**: React Router for page loading and actions
- **Service Layer**: Business logic and API call encapsulation
- **Data Layer**: Prisma ORM + PostgreSQL + Redis

Core development principles:

1. **Separation of Concerns**: Clear UI/service/data layer responsibilities
2. **Type Safety**: Comprehensive TypeScript type definitions
3. **Real-time Capabilities**: Server-Sent Events (SSE) for real-time updates
4. **Scalability**: Modular design for easy integration of new grading criteria and AI models
5. **User Experience**: Enhanced interaction with upload progress and grading animations

Overall, this is a feature-complete modern full-stack application using React ecosystem best practices, providing AI-assisted functionality for educational grading scenarios.
