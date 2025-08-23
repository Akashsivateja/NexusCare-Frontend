# CloudVault: Secure Health Management Platform 🩺

CloudVault is a full-stack web application that simplifies health management for patients and doctors. It provides a secure platform to track vitals, manage medical files, streamline consultations, and generate AI-powered health summaries.

**Live URLs:**

* Frontend: [https://nexuscare-frontend.onrender.com](https://nexuscare-frontend.onrender.com)
* Backend: [https://nexuscare-backend.onrender.com](https://nexuscare-backend.onrender.com)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Backend](#backend)

   * [Architecture](#backend-architecture)
   * [Authentication & Security](#authentication--security)
   * [Patient Data Management](#patient-data-management)
   * [Doctor-Patient Consultation System](#doctor-patient-consultation-system)
   * [Doctor-Specific Patient Management](#doctor-specific-patient-management)
   * [Environment Variables](#environment-variables)
3. [Frontend](#frontend)
4. [Key Challenges & Solutions](#key-challenges--solutions)
5. [Future Improvements](#future-improvements)
6. [Technologies Used](#technologies-used)

---

## Project Overview

CloudVault solves fragmented health record management and inefficient doctor-patient communication.

**Patient Features:**

* Track daily vitals (BP, sugar, heart rate)
* Upload and securely store medical files
* Receive AI-generated health summaries
* View and manage consultation requests

**Doctor Features:**

* Access patient vitals and files
* Add clinical notes and issue prescriptions
* Generate AI-based patient health summaries
* Manage consultation requests

**Why CloudVault:** Secure, centralized, and intelligent health management with AI-powered insights.

---

## Backend

### Backend Architecture

* **server.js:** Initializes Express server, connects to MongoDB via Mongoose, sets CORS, handles JSON and file uploads, and loads modular API routes.
* **Route Structure:** Separate routes for authentication, records, files, consultations, and doctor management keep the backend organized and scalable.

### Authentication & Security

* **User Model:** Differentiates roles (`patient`/`doctor`), tracks consultation relationships, and stores secure credentials.
* **Registration & Login:** Passwords hashed using bcrypt; JWTs used for secure session management.
* **Middleware:** `authMiddleware.js` ensures protected routes are accessed only by authorized users.

### Patient Data Management

* **Vitals:** Patients can submit and retrieve daily health metrics.
* **Files:** Upload medical documents to AWS S3; metadata stored in MongoDB for secure access.

### Doctor-Patient Consultation System

* Patients search doctors by name or specialty.
* Consultation requests tracked symmetrically in both patient and doctor records.
* Doctors can approve or reject requests, establishing secure consulting relationships.

### Doctor-Specific Patient Management

* **Role-Restricted Access:** Only doctors can access these routes.
* **Patient Data Access:** Verified with `isDoctorConsultingPatient`.
* **Notes & Prescriptions:** Doctors can add private notes and issue prescriptions linked to patients.
* **AI Health Summaries:** Aggregates vitals, notes, and file references, then generates concise health summaries using Mistral AI.

### Environment Variables

* Sensitive info (`MONGO_URI`, `JWT_SECRET`, `AWS_S3_KEY`, `MISTRAL_API_KEY`) stored in `.env` and loaded via `dotenv`.

---

## Frontend

* **Tech:** HTML, CSS, JavaScript
* **auth.js:** Handles login and registration, stores JWT in localStorage
* **dashboard.js:** Dynamically renders patient/doctor dashboards, fetches data, and uses Chart.js for vitals visualization
* Includes notifications, loading states, and interactive elements for better user experience

---

## Key Challenges & Solutions

| Challenge                             | Solution                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| Secure Authentication & Authorization | JWTs, bcrypt, middleware, and RBAC ensure secure role-based access.                |
| Scalable File Storage                 | AWS S3 integration offloads storage from server; only metadata stored in MongoDB.  |
| Complex Doctor-Patient Relationships  | Symmetric arrays in User schema with careful route logic ensure accurate tracking. |
| AI Health Summaries                   | Secure API key management and aggregated data prompts allow reliable AI summaries. |
| Frontend-Backend Communication        | Configured CORS for frontend domain to enable secure API requests.                 |

---

## Future Improvements

* **Enhanced Input Validation:** Server-side checks for vitals and files
* **Real-Time Notifications:** WebSocket integration for instant updates
* **Profile Management:** Allow users to update personal info securely
* **Advanced Data Filtering:** Filter vitals, files, and notes by date or keyword
* **Appointment Scheduling:** Enable patients to book consultations directly
* **Two-Factor Authentication:** Additional login security

---

## Technologies Used

* **Backend:** Node.js, Express.js, MongoDB, Mongoose
* **Frontend:** HTML, CSS, JavaScript, Chart.js
* **File Storage:** AWS S3
* **AI Integration:** Mistral AI
* **Security:** JWT, bcrypt
* **Deployment:** Render

---
