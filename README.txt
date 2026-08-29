================================================================
COMPUTER CARE (ANUBHAV EDUVISTA) - ACADEMY MANAGEMENT SYSTEM
================================================================

VERSION: 2.0 | HTML + CSS + JavaScript | Optional Node JSON Backend
Developed for: Computer Care (Anubhav EduVista), Kapurthala, Punjab

================================================================
HOW TO RUN
================================================================

1. Extract this ZIP folder anywhere on your computer
2. Open the folder and double-click "index.html"
3. The login page will open in your browser
4. Use the demo credentials below to log in

NOTE: Works best in Chrome, Edge, or Firefox (modern browsers).
All data is stored locally in your browser using LocalStorage.

OPTIONAL BACKEND MODE:
  1. Open this folder in a terminal
  2. Run: npm start
  3. Open: http://localhost:3000
  4. Data is saved in db/database.json and controlled from backend.html

================================================================
LOGIN CREDENTIALS
================================================================

ADMIN / TEACHER LOGIN:
  Admin:    username: admin      | password: admin123
  Manjinder: username: manjinder | password: teacher123
  Vishu:    username: vishu      | password: teacher123
  Anmol:    username: anmol      | password: teacher123
  Harpreet: username: harpreet   | password: teacher123

STUDENT LOGIN:
  Rahul Kumar:  username: rahul123 | password: student123
  Priya Sharma: username: priya123 | password: student123
  Amit Singh:   username: amit123  | password: student123

================================================================
PAGES & FEATURES
================================================================

TEACHER / ADMIN PORTAL:
  index.html           → Login Page (Teacher & Student)
  teacher-dashboard.html → Main Dashboard with Charts & Analytics
  students.html        → Add/Edit/View Students & Teachers
  fees.html            → Fees Management & Payment Ledger
  attendance.html      → Daily Attendance Register (Click to cycle)
  timetable.html       → Editable Time Table with Batch & PC
  topics.html          → Daily Topics per Student
  gallery.html         → Photo Gallery with Upload
  reports.html         → Certificates, DMC, PDF/CSV Export
  courses.html         → Course & Sub-category Management

STUDENT PORTAL:
  student-portal.html  → Complete Student Dashboard
                         - My Fees Ledger
                         - Download Fee Receipts
                         - My Course History & Topics
                         - My Attendance History
                         - Download My PC/Laptop Time Table
                         - Academy Gallery

================================================================
KEY FEATURES
================================================================

✅ Teachers Portal with Full Dashboard
✅ Students Portal (Username/Password created by Teacher)
✅ Fees Management with Installment Tracking & Receipts
✅ Daily Attendance (Click cycles: None → Present → Absent → Leave)
✅ Editable PC/Laptop Time Table (add/remove PCs and laptops)
✅ Student Fee Receipt Downloads
✅ Student Timetable PDF Downloads
✅ Admin Backend & Database Control Page
✅ Salary Privacy: admin sees all, each teacher sees only their own salary
✅ Daily Topics Tracker per Student
✅ Gallery with Upload & Lightbox
✅ Certificate Generator (PDF)
✅ DMC (Detail Marks Card) Generator (PDF)
✅ Student/Teacher Profile PDF
✅ CSV Export for all data
✅ Full Database Backup/Restore (JSON)
✅ Dark/Light Mode Toggle
✅ Fully Responsive (Mobile, Tablet, Laptop, Desktop)
✅ 12 Courses with Sub-categories
✅ Pre-loaded: 3 Students, 4 Teachers
✅ LocalStorage Auto-save

================================================================
FILE STRUCTURE
================================================================

academy-management/
├── index.html              → Login Page
├── teacher-dashboard.html  → Teacher Dashboard
├── students.html           → Student & Teacher Management
├── fees.html               → Fees Management
├── attendance.html         → Attendance Register
├── timetable.html          → Time Table
├── topics.html             → Daily Topics
├── gallery.html            → Photo Gallery
├── reports.html            → Reports & Export
├── backend.html            → Backend & Database Controls
├── courses.html            → Course Management
├── student-portal.html     → Student Portal
├── css/
│   └── styles.css          → Centralized Stylesheet
└── js/
    ├── data.js             → Data Layer (LocalStorage + Backend Sync)
    ├── auth.js             → Authentication
    ├── app.js              → Shared Utilities & Theme
    ├── dashboard.js        → Dashboard Charts
    ├── students.js         → Student/Teacher CRUD
    ├── fees.js             → Fees Management
    ├── attendance.js       → Attendance Logic
    ├── timetable.js        → Time Table Logic
    ├── gallery.js          → Gallery & Upload
    ├── topics.js           → Daily Topics
    └── reports.js          → Certificate & Export

================================================================
ACADEMY DETAILS
================================================================

Computer Care (Anubhav EduVista)
Near Landon Hotel, Behind Jain Petrol Pump
Kapurthala, Punjab
Mobile: +91 78371-96514
Email: Anubhav.EduVista@gmail.com
Website: Computercareskpt.in

================================================================
SUPPORT
================================================================

For customization or issues, open the browser console (F12)
and check for any JavaScript errors.

All data is stored in browser LocalStorage.
To transfer data between computers: use Reports → Export Full Database,
then import the JSON on the other browser.

================================================================
