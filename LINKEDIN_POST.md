# LinkedIn post — RateProf

> Post this **after** the critical fixes in AUDIT.md §1 are deployed. A LinkedIn post will send traffic to the site.
> Tag: Robin Singla, Haritika, Dr. Anjula Mehto, Thapar Institute of Engineering & Technology.
> Attach: 3–4 real screenshots (teacher page, review form, tag breakdown, admin moderation). Skip the logo/hero image.

---

## Version A — main post (~230 words)

Every semester at Thapar, the same question goes round every hostel group chat:

"Who should I take for this elective?"

The answers are scattered, outdated, and usually from one senior who had a bad week. So for our Software Engineering project (UCS503), we built **RateProf**: a place where Thapar students can leave honest, structured feedback on faculty and courses.

A few decisions we're proud of:

→ **Only students who were actually taught can review.** We parsed the official timetables for every year into batch/branch/course data. If you weren't in that section, you can't review that professor for that course.
→ **One review per course per 21 days**, enforced in a database transaction, so spamming doesn't work even with parallel requests.
→ **Recent reviews count more.** Ratings are time-weighted, and there's a separate "this semester" score, because teaching changes.
→ **Faculty can reply.** Feedback should be a conversation, not a wall of complaints.

The biggest lesson wasn't technical. It was trust. Anonymity, eligibility checks and moderation took far more of our time than the UI did, and they're the reason anyone would believe a rating on the site.

Built with React, Node.js microservices, PostgreSQL and Prisma, plus Gemini for summarising reviews.

Huge thanks to my teammates Robin Singla and Haritika, and to our mentor Dr. Anjula Mehto for pushing us to treat this like a real product.

If you're at Thapar, try it at rateprof.tech and tell us what's broken. We're listening.

#Thapar #TIET #SoftwareEngineering #StudentProjects #WebDevelopment

---

## Version B — short (~90 words)

"Who should I take for this elective?" is the most-asked question at Thapar every semester.

For our UCS503 Software Engineering project, Robin Singla, Haritika and I built **RateProf**, verified faculty feedback for TIET students.

You can only review a professor if the official timetable shows they taught your batch. One review per course every 21 days. Recent semesters weigh more. Faculty can reply.

Thanks to Dr. Anjula Mehto for mentoring us.

Thapar folks: rateprof.tech. Tell us what to fix.

#Thapar #TIET #SoftwareEngineering

---

## Writing notes (why it's written this way)
- Opens with a real student problem, not "Excited to announce 🚀".
- Every claim is something the code actually does today. It doesn't say "AI-powered", "cutting-edge", "1000s of users" or "official TIET portal".
- Says "built by students", so it can't be mistaken for an institute-endorsed system.
- The "lesson learned" paragraph is what makes people comment; keep it in your own words if you edit.
- Post Tue–Thu, 9–11 AM IST. Reply to every comment in the first hour.
