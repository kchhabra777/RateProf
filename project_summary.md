# RateProf (Campus Feedback System) - Comprehensive Project Summary

This document serves as a complete architectural, technical, and structural summary of the RateProf (Campus Feedback System) project. It provides all necessary context for LLMs (like Claude) to understand the codebase and assist with development.

## 1. Project Overview & Objective
RateProf is a comprehensive feedback and rating platform built for the Thapar Institute of Engineering and Technology (TIET). It allows students to provide verified, constructive feedback on faculty and courses, while enforcing strict institutional authentication and review integrity rules.

**Live Deployments:**
- **Web App:** [rateprof.tech](https://www.rateprof.tech) / Vercel
- **API Gateway:** Render
- **Database:** Serverless PostgreSQL (Neon)

## 2. Technical Stack
### Frontend (`/frontend`)
- **Framework:** React 19 + Vite (Single Page Application)
- **Styling:** Tailwind CSS (v4), Radix UI (Headless UI components)
- **Animations & Visuals:** Framer Motion, Recharts
- **Authentication:** Clerk (`@clerk/clerk-react`)
- **Analytics:** Vercel Speed Insights
- **Other utilities:** Sonner (Toast notifications), `lucide-react` (Icons)

### Backend (Microservices)
- **Runtime:** Node.js + Express.js (ES Modules)
- **ORM:** Prisma (`@prisma/client`, `@prisma/adapter-neon`, `@prisma/adapter-pg`)
- **Database:** PostgreSQL (Neon)
- **AI Integration:** Google Gemini 3.5 Flash (`@google/genai`) for qualitative review summarization.
- **Other utilities:** `bcryptjs`, `jsonwebtoken`, `nodemailer` (for domain-enforced OTPs).

## 3. Architecture & Repository Structure
The project follows a **Microservices Architecture** exposed via an API Gateway.

```text
├── auth-service/               # (Port 5001) Auth, User Profiles, Course Offerings, Support Posts
├── feedback-microservice/      # (Port 5000) Reviews, Ratings, Community Tags, Gemini AI Synthesis
├── gateway/                    # (Port 8000) Express.js reverse proxy & Clerk token verification
├── frontend/                   # (Port 5173) React SPA
├── docs/                       # MkDocs documentation source files
├── journals/                   # Weekly student work logs
├── assets/                     # Logos, stylesheets, and theme overrides
├── project-proposal/           # Project proposal documentation
├── project-report-prototype-stage/ # Prototype documentation
├── .github/workflows/          # CI/CD for MkDocs deployment
├── Makefile                    # Make automation targets (make dev, make test, make docs)
├── mkdocs.yml                  # Material for MkDocs theme configuration
├── vercel.json                 # Vercel deployment configuration
└── *.py                        # Timetable parsers and seed generation scripts
```

## 4. Microservices Breakdown
### A. API Gateway (`/gateway`)
- Acts as a reverse proxy using `http-proxy-middleware`.
- Routes `/api/*`, `/auth/*`, `/profiles/*`, `/courses/*`, `/admin/*`, `/reviews/*`, `/ratings/*` to the appropriate microservice.
- Integrates `@clerk/backend` to verify session tokens before forwarding protected requests.

### B. Auth Service (`/auth-service`)
- **Responsibilities:** Custom institutional onboarding, Profile Management, Course Catalog.
- **Key Logic:**
  - Enforces `@thapar.edu` domain restriction.
  - Sends Cryptographic OTPs via Nodemailer.
  - Auto-detects user roles (Student vs. Faculty) based on email patterns.
  - Manages `StudentProfile`, `TeacherProfile`, and `CourseOffering` schemas.
  - Manages `SupportPost` and `SupportComment` features.
  - Manages `BatchChangeRequest` and `TeacherNameSuggestion`.

### C. Feedback Microservice (`/feedback-microservice`)
- **Responsibilities:** Reviews, Voting, Flags, AI Synthesis, and Analytics.
- **Key Logic:**
  - **Review Integrity:** Enforces a 21-day cooldown per student-instructor pair.
  - **Rating Algorithm:** Implements a dual time-decay rating system ($w_i = 1 / (1 + age/30)$) to prioritize recent feedback.
  - **AI Synthesis:** Interacts with Gemini AI to generate a 5-category evaluation taxonomy (Teaching Quality, Grading, Approachability, Workload, Vibe) from qualitative text reviews.
  - Manages `Review`, `ReviewVote`, `ReviewReply`, `ReviewFlag`, `CommunityTag`, and `ProfileRating` schemas.

## 5. Database Schema (Prisma)
Both backend services connect to the same PostgreSQL cluster (or closely mirrored schemas). Below are the core entities:
- **User:** Email, passwordHash, Role (STUDENT, TEACHER, ADMIN), isEmailVerified.
- **StudentProfile:** rollNumber, branch, batch, yearOfStudy, isCR, xp.
- **TeacherProfile:** fullName, department, designation, roomNumber, linkedIn, photoUrl, offerings.
- **CourseOffering:** Maps a Teacher to a specific Course, Batch, Branch, and Academic Year (L/T/P classification).
- **Review:** reviewerId, revieweeId, rating, reviewText, context, flags, votes, replies.
- **ReviewReply & ReviewFlag:** Handles threaded discussions and moderation workflows.
- **CommunityTag:** Aggregated sentiment analytics (positive/constructive).
- **SupportPost / SupportComment:** Anonymous student support forums.

## 6. Data Ingestion & Utilities
The root directory contains several Python scripts used for scraping and migrating campus data into the system:
- `parse_thapar_timetable.py` / `parse_all_thapar_timetables.py`: Parses university `.csv` timetables to extract faculty-course-batch mappings.
- `generate_seed_json.py`: Converts parsed timetable data into seed files for Prisma.

## 7. Key Configuration Files
- **Root `vercel.json`:** Overrides standard deployment behavior to `cd frontend && npm install` and sets output directory to `frontend/dist`. It also defines URL rewrites to the Render-hosted API Gateway.
- **Root `package.json`:** Defines concurrent dev scripts (`npm run dev`) to launch all microservices and the frontend simultaneously.

## 8. Deployment Workflow
- Changes pushed to `main` are auto-deployed.
- Vercel handles the Frontend build.
- Render handles the API Gateway, Auth Service, and Feedback Microservice.
- Make sure not to execute `vercel` CLI within the `/frontend` directory if the Vercel dashboard "Root Directory" is configured to `frontend`, to avoid directory path mismatches.
