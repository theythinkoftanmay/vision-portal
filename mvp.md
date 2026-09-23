Here is the updated **`mvp_update_3.md`** incorporating the crowdsourced Community Timetable model, fork/clone data flow, social validation mechanics, and updated scope.

---

# Vision: Student Portal MVP

**One line:** A mobile-first web app where students find or publish their college timetable via a community hub, customize their electives/batches, and track daily attendance and assignments in one place.

**Launch scope:** Multi-course community onboarding starting with Delhi University colleges (e.g., College of Vocational Studies) and beta-tested with 5–10 students.

---

## Strategic Adjustments & Edge Cases Addressed

1. **Cold-Start Data Problem Solved:** Eliminates manual backend data entry for hundreds of university schedules. The first student in a class sets up the template; everyone else clones it in one click.
2. **Fork/Clone Architecture:** When a student selects a community schedule, the system creates a **deep copy** into their personal `student_slots` table. Edits or deletions made by the original author will never corrupt or alter another student's personal schedule.
3. **Social Validation against Garbage Data:** Community templates display the author's name, clone count, and an upvote score (*"Created by Rahul S. • Cloned by 14 students"*) to signal legitimate schedules.
4. **Core + Elective Hybrid Flow:** Community templates handle shared core subjects. Students customize their SEC/VAC/GE electives and practical lab batches on top of the base template during onboarding.

---

## What's in

### 1. Sign Up, Community Hub & Onboarding

* Sign in via Email or Google (Supabase Auth).
* **Search Community Timetables:** Search by College Name, Course, and Semester (e.g., *"College of Vocational Studies, B.Sc Computer Science, Sem 1"*).
* **Clone or Create:** Clone an existing community template or build a new one from scratch to publish to the community.
* **Personal Customization:** Select your specific SEC/VAC electives and lab/tutorial batches (e.g., Batch A1 vs. Batch A2) to complete your personal timetable.

### 2. Timetable & Daily Schedule

* **Weekly View & Today View.**
* **Publish Schedule:** Option to publish or update a shared timetable to the Community Hub.
* **One-off Schedule Exceptions:** Cancel a single lecture on a specific date or add a makeup class without altering the recurring weekly template.
* **Holidays / Days Off:** One-tap option to dismiss all classes for a specific day.

### 3. Attendance Tracking

* Mark **Attended**, **Missed**, or **Cancelled** for each class on the "Today" screen.
* **Quick Action:** "Mark All as Attended" button for fast logging.
* **Subject-wise %** and **Weighted Overall %**.
* Low-attendance warning indicator for subjects below 75%.
* Backfill or edit attendance logs for past dates.

### 4. Assignments

* Add an assignment with subject, title, and due date.
* Three statuses: **Pending → Completed → Submitted**.
* Sort by due date; filter by subject or status.

---

## What's out (for now)

* Admin/Institution portal or teacher logins.
* Real-time automated sync with official university portals.
* Push notifications, chat, and social messaging features.
* Drag-and-drop schedule editing (kept to form-based overrides for V1).

---

## Rules & Formulas

* **Subject Attendance %**:

$$\text{Subject \%} = \frac{\text{Attended}}{\text{Attended} + \text{Missed}} \times 100$$


* **Overall Attendance %** (Weighted across all classes):

$$\text{Overall \%} = \frac{\sum \text{Total Attended Across All Subjects}}{\sum (\text{Total Attended} + \text{Total Missed}) \text{ Across All Subjects}} \times 100$$


* **Cancelled Classes:** Excluded entirely from calculations.
* **Data Integrity:** Attendance is logged against `(student_id, subject_id, date, start_time)`. Deleting or modifying a timetable slot never affects historical attendance entries.

---

## Data Model

| Table | Key Fields | Description |
| --- | --- | --- |
| `students` | `id`, `name`, `college_name`, `course`, `semester`, `batch` | Registered user profiles. |
| `subjects` | `id`, `name`, `type` (core/GE/SEC/VAC), `college_name`, `course` | Global/local subject catalog. |
| `community_timetables` | `id`, `college_name`, `course`, `semester`, `section_or_batch`, `created_by`, `clones_count`, `upvotes_count` | Shared community schedule headers. |
| `community_slots` | `id`, `timetable_id`, `subject_name`, `subject_type`, `weekday` (0-6), `start_time`, `end_time` | Slots belonging to a shared template. |
| `student_slots` | `id`, `student_id`, `subject_id`, `weekday` (0-6), `start_time`, `end_time` | Personal cloned recurring weekly schedule. |
| `schedule_exceptions` | `id`, `student_id`, `subject_id`, `date`, `exception_type` ('cancelled' | 'extra'), `start_time`, `end_time` | Date-specific schedule changes. |
| `attendance` | `id`, `student_id`, `subject_id`, `date`, `start_time`, `status` ('attended' | 'missed' | 'cancelled') | Daily attendance logs. |
| `assignments` | `id`, `student_id`, `subject_id`, `title`, `due_date`, `status` ('pending' | 'completed' | 'submitted') | Assignment logs. |

---

## Screens (Six)

1. **Login & Onboarding:** Auth, College/Course selection, Community Hub search.
2. **Community Hub:** Search, template cards (author, clone count, upvotes), and "Publish New Timetable" flow.
3. **Today View:** Daily class list, "Mark All as Attended" button, and status toggles.
4. **Timetable View:** Personal weekly schedule, elective customization, and single-day exception triggers.
5. **Attendance Summary:** Subject progress bars, <75% warnings, weighted overall %, and past-date backfilling.
6. **Assignments Tracker:** List view, filter by subject/status, and due date sorting.

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| **Frontend** | React + Vite + TypeScript |
| **Backend / DB** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Styling** | Tailwind CSS |
| **Routing** | React Router |
| **Validation & Forms** | Zod + React Hook Form |
| **Data Fetching** | TanStack Query |
| **Icons** | Lucide React |
| **Deployment** | Vercel / Netlify |

---

## Build Order

1. **Database Schema Setup:** Supabase tables (`students`, `community_timetables`, `community_slots`, `student_slots`, `attendance`, `assignments`) and RLS policies.
2. **Timetable Builder & Community Hub:** Search, publish schedule, upvote system, and deep-copy cloning logic into `student_slots`.
3. **Onboarding Flow:** Search Community $\rightarrow$ Fork schedule template $\rightarrow$ Add custom SEC/VAC/Lab batches.
4. **Today View:** Daily timetable rendering, attendance logging buttons, and "Mark All as Attended" action.
5. **Attendance Calculations & Summary Screen:** Subject % bars, weighted overall %, and backfill picker.
6. **Schedule Exceptions:** One-off cancelled and extra makeup class overrides (`schedule_exceptions`).
7. **Assignments Tracker:** Task creation, filters, and status toggles.
8. **Beta Rollout:** Pilot test with 5–10 students across different courses/colleges.

---

## Test for Success

For **14 consecutive days**, beta testers open the app on their own to mark daily attendance without reminders, and at least **1 non-author student successfully clones and customizes a community-published timetable**.