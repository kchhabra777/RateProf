import prisma from "./prisma.js";

// Server-side copy of auth-service's verifyStudentTeacherEligibility (courseService.js), which
// backs GET /courses/check-eligibility. Keep the two in sync: a student may review a teacher only
// if one of the teacher's offerings matches the student's batch/branch (core courses) or one of
// the student's selected electives, and, when a course code is given, that course.
export const verifyStudentTeacherEligibility = async ({ studentProfile, teacherUserId, courseCode }) => {
    if (!studentProfile) {
        return { eligible: false, reason: "Student profile not found" };
    }

    const teacher = await prisma.teacherProfile.findUnique({
        where: { userId: teacherUserId },
        include: { offerings: true }
    });

    if (!teacher) {
        return { eligible: false, reason: "Teacher profile not found" };
    }

    const studentBatch = (studentProfile.batch || "").trim().toUpperCase();
    let effectiveBranch = studentProfile.branch;
    if (studentBatch.includes("Q")) {
        effectiveBranch = "COPC";
    } else if (studentBatch.includes("C") && !studentBatch.includes("COPC")) {
        effectiveBranch = "COE";
    }

    const selectedElectivesSet = new Set(
        (studentProfile.selectedElectives || [])
            .map(e => String(e).trim().toUpperCase())
            .filter(e => e && e !== "NONE")
    );

    const wantedCourse = courseCode ? String(courseCode).trim().toUpperCase() : null;
    const courseMatches = (off) => !wantedCourse || off.courseCode.trim().toUpperCase() === wantedCourse;

    const matchingOffering = teacher.offerings.find((off) => {
        if (off.isElective) {
            return selectedElectivesSet.has(off.courseCode.trim().toUpperCase()) && courseMatches(off);
        }

        const batches = off.batchTaught.split(",").map((b) => b.trim().toUpperCase());
        const isSpecificBatchMatch = batches.includes(studentBatch) || off.batchTaught === studentBatch;
        const isAllBatch = off.batchTaught === "ALL";

        if (!isSpecificBatchMatch && !isAllBatch) return false;

        // A specific batch (e.g. 3C11) belongs to exactly one curriculum at Thapar
        if (isSpecificBatchMatch) return courseMatches(off);

        const branches = off.branchTaught.split(",").map((b) => b.trim().toUpperCase());
        const branchMatches = off.branchTaught === "ALL" || branches.includes(effectiveBranch) || off.branchTaught.includes(effectiveBranch);
        return branchMatches && courseMatches(off);
    });

    // Teachers with no offerings on record are open to everyone, as in auth-service
    if (!matchingOffering && teacher.offerings.length > 0) {
        return {
            eligible: false,
            reason: `Teacher is not registered as having taught batch ${studentProfile.batch} (${effectiveBranch}) or your selected electives.`
        };
    }

    return { eligible: true, matchingCourse: matchingOffering || null };
};
