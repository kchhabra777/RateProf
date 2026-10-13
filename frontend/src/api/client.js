const API_BASE = import.meta.env.DEV ? "http://localhost:8000" : "/api";

let tokenProvider = null;

export function setTokenProvider(provider) {
  tokenProvider = provider;
}

export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    // 30-second buffer to prevent edge-case race conditions
    if (payload.exp && Date.now() >= payload.exp * 1000 - 30000) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function getHeaders(extraHeaders = {}) {
  let token = localStorage.getItem("campus_token");
  
  // Immediately discard expired local tokens
  if (token && isTokenExpired(token)) {
    localStorage.removeItem("campus_token");
    localStorage.removeItem("campus_user_email");
    token = null;
  }
  
  if (!token && tokenProvider) {
    try {
      const dynamicToken = await tokenProvider();
      if (dynamicToken && !isTokenExpired(dynamicToken)) token = dynamicToken;
    } catch (e) {
      console.warn("Could not fetch auth token:", e);
    }
  }
  
  if (!token && window.Clerk && window.Clerk.session) {
    try {
      const clerkToken = await window.Clerk.session.getToken();
      if (clerkToken) token = clerkToken;
    } catch (e) {}
  }

  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        if (payload.email) headers["x-user-email"] = payload.email;
        if (payload.role) headers["x-user-role"] = payload.role;
        if (payload.userId || payload.sub) headers["x-user-id"] = payload.userId || payload.sub;
      }
    } catch (e) {}
  }

  const storedEmail = localStorage.getItem("campus_user_email");
  if (storedEmail && !headers["x-user-email"]) {
    headers["x-user-email"] = storedEmail;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = await getHeaders(options.headers);
  const config = {
    ...options,
    headers
  };

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // If unauthorized / token invalid, clear stale credentials
    if (response.status === 401) {
      localStorage.removeItem("campus_token");
      localStorage.removeItem("campus_user_email");
    }
    if (response.status === 403 && data.isBanned) {
      try {
        window.dispatchEvent(new CustomEvent("campus_user_suspended", { detail: data }));
      } catch (e) {}
    }
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.isBanned = !!data.isBanned;
    throw error;
  }

  return data;
}

export const ALLOWED_BRANCHES = [
  "Computer Engineering (COE)",
  "Electronics & Communication (ECE)",
  "Electronics & Computer (ENC)",
  "Electrical & Computer (EEC)",
  "Mechanical Engineering (ME)",
  "Civil Engineering (CE)",
  "Chemical Engineering (CHE)",
  "Biotechnology (BT)"
];

export { ALLOWED_BATCHES } from "./batches.js";

export const ALLOWED_ACADEMIC_YEARS = [
  "2026-2027 ODD",
  "2026-2027 EVEN",
  "2025-2026",
  "2024-2025"
];

export const api = {
  // Auth & Roles
  syncClerkUser: (userData) => request("/auth/clerk-sync", {
    method: "POST",
    body: JSON.stringify(userData)
  }),
  checkEmail: (email) => request("/auth/check-email", {
    method: "POST",
    body: JSON.stringify({ email })
  }),
  sendOtp: (email) => request("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ email })
  }),
  signup: ({ email, password, otp }) => request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, otp })
  }),
  login: ({ email, password }) => request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  }),
  forgotPasswordSendOtp: (email) => request("/auth/forgot-password/send-otp", {
    method: "POST",
    body: JSON.stringify({ email })
  }),
  forgotPasswordReset: ({ email, otp, newPassword }) => request("/auth/forgot-password/reset", {
    method: "POST",
    body: JSON.stringify({ email, otp, newPassword })
  }),
  changePasswordSendOtp: () => request("/auth/change-password/send-otp", {
    method: "POST"
  }),
  changePasswordVerifyAndUpdate: ({ otp, newPassword }) => request("/auth/change-password/verify-and-update", {
    method: "POST",
    body: JSON.stringify({ otp, newPassword })
  }),
  changePassword: ({ otp, newPassword }) => request("/auth/change-password/verify-and-update", {
    method: "POST",
    body: JSON.stringify({ otp, newPassword })
  }),
  getMe: () => request("/auth/me"),

  // Profiles
  onboardStudent: (data) => request("/profiles/student", {
    method: "POST",
    body: JSON.stringify(data)
  }),
  onboardTeacher: (data) => request("/profiles/teacher", {
    method: "POST",
    body: JSON.stringify(data)
  }),
  getAllTeachers: () => request("/profiles/teachers"),
  getTeacherProfile: (teacherId) => request(`/profiles/teachers/${teacherId}`),

  // Courses & Offerings CRUD
  getEligibleTeachers: (batch, branch) => {
    const params = new URLSearchParams();
    if (batch) params.append("batch", batch);
    if (branch) params.append("branch", branch);
    const query = params.toString();
    return request(`/courses/eligible-teachers${query ? `?${query}` : ""}`);
  },
  getMyOfferings: () => request("/courses/my-offerings"),
  addCourseOffering: (data) => request("/courses/offerings", {
    method: "POST",
    body: JSON.stringify(data)
  }),
  updateCourseOffering: (id, data) => request(`/courses/offerings/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  }),
  deleteCourseOffering: (id) => request(`/courses/offerings/${id}`, {
    method: "DELETE"
  }),
  checkEligibility: (teacherId, courseCode) =>
    request(`/courses/check-eligibility?teacherId=${teacherId}${courseCode ? `&courseCode=${courseCode}` : ""}`),

  // Feedback, Reviews, Votes, Flags, Replies
  createReview: (data) => request("/reviews", {
    method: "POST",
    body: JSON.stringify(data)
  }),
  getTeacherReviews: (teacherId, page = 1) => request(`/reviews/reviewee/${teacherId}?page=${page}`),
  getTeacherTagStats: (teacherId) => request(`/reviews/teachers/${teacherId}/tags`),
  getTeacherAISummary: (teacherId) => request(`/reviews/teachers/${teacherId}/ai-summary`),
  getTeacherRatings: (teacherId) => request(`/ratings/${teacherId}`),
  getRatingsSummary: () => request("/ratings/batch/summary"),
  getStudentLeaderboard: () => request("/profiles/students/leaderboard"),
  voteReview: (reviewId, voteType, userId) => request(`/reviews/${reviewId}/vote`, {
    method: "POST",
    body: JSON.stringify({ user: { userId }, vote: { type: voteType } })
  }),
  flagReview: (reviewId, reason, userId) => request(`/reviews/${reviewId}/flag`, {
    method: "POST",
    body: JSON.stringify({ user: { userId }, reason })
  }),
  getFlags: () => request(`/reviews/flags`),
  resolveFlag: (flagId, action) => request(`/reviews/flags/${flagId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ action })
  }),
  addReply: (reviewId, data) => request(`/reviews/${reviewId}/replies`, {
    method: "POST",
    body: JSON.stringify(data)
  }),
  voteReply: (replyId, voteType, userId) => request(`/reviews/replies/${replyId}/vote`, {
    method: "POST",
    body: JSON.stringify({ user: { userId }, vote: { type: voteType } })
  }),
  getReplies: (reviewId) => request(`/reviews/${reviewId}/replies`),

  // Admin Powers
  getStudents: () => request("/admin/students"),
  banUser: (userId, isBanned) => request(`/admin/users/${userId}/ban`, {
    method: "PATCH",
    body: JSON.stringify({ isBanned })
  }),
  updateStudent: (userId, data) => request(`/admin/students/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data)
  }),
  getBatchRequests: () => request("/admin/batch-requests"),
  approveBatchRequest: (id) => request(`/admin/batch-requests/${id}/approve`, {
    method: "POST"
  }),
  rejectBatchRequest: (id) => request(`/admin/batch-requests/${id}/reject`, {
    method: "POST"
  }),
  updateTeacher: (userId, data) => request(`/admin/teachers/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data)
  }),
  deleteTeacher: (teacherId) => request(`/admin/teachers/${teacherId}`, {
    method: "DELETE"
  }),
  getAdminTeacherCourses: (teacherId) => request(`/admin/teachers/${teacherId}/courses`),
  addAdminTeacherCourse: (teacherId, data) => request(`/admin/teachers/${teacherId}/courses`, {
    method: "POST",
    body: JSON.stringify(data)
  }),
  updateAdminTeacherCourse: (courseId, data) => request(`/admin/courses/${courseId}`, {
    method: "PUT",
    body: JSON.stringify(data)
  }),
  deleteAdminTeacherCourse: (courseId) => request(`/admin/courses/${courseId}`, {
    method: "DELETE"
  }),
  getAdminTags: () => request("/admin/tags"),
  addAdminTag: (data) => request("/admin/tags", { method: "POST", body: JSON.stringify(data) }),
  updateAdminTag: (id, data) => request(`/admin/tags/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAdminTag: (id) => request(`/admin/tags/${id}`, { method: "DELETE" }),
  getPublicTags: () => request("/reviews/tags"),
  adminRegisterTeacher: (data) => request("/admin/register-teacher", {
    method: "POST",
    body: JSON.stringify(data)
  }),
  suggestTeacherName: (teacherId, data) => request(`/profiles/teachers/${teacherId}/suggest-name`, {
    method: "POST",
    body: JSON.stringify(data)
  }),
  toggleStudentCR: (studentId) => request(`/admin/students/${studentId}/toggle-cr`, {
    method: "PATCH"
  }),
  getTeacherSuggestions: () => request("/admin/teacher-suggestions"),
  approveTeacherSuggestion: (id) => request(`/admin/teacher-suggestions/${id}/approve`, {
    method: "POST"
  }),
  rejectTeacherSuggestion: (id) => request(`/admin/teacher-suggestions/${id}/reject`, {
    method: "POST"
  }),
  getSemesterStats: () => request("/admin/semester-stats"),
  rolloverSemester: (data) => request("/admin/rollover-semester", {
    method: "POST",
    body: JSON.stringify(data)
  }),

  // Student & CR Batch Change Requests
  requestBatchChange: (data) => request("/profiles/student/request-batch-change", {
    method: "POST",
    body: JSON.stringify(data)
  }),
  getMyBatchRequests: () => request("/profiles/student/batch-requests"),
  getCRBatchRequests: () => request("/profiles/student/cr/batch-requests"),

  // Admin Batch Change Management
  getAdminBatchRequests: () => request("/admin/batch-requests"),
  approveAdminBatchRequest: (id) => request(`/admin/batch-requests/${id}/approve`, {
    method: "POST"
  }),
  rejectAdminBatchRequest: (id, reason) => request(`/admin/batch-requests/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason })
  }),

  // Campus Analytics (Phase 1.1)
  getCampusAnalytics: (department = 'ALL') => request(`/admin/analytics?department=${encodeURIComponent(department)}`),

  // Peer Support
  getSupportPosts: () => request("/support/posts"),
  createSupportPost: (data) => request("/support/posts", {
    method: "POST",
    body: JSON.stringify(data)
  }),
  upvoteSupportPost: (postId) => request(`/support/posts/${postId}/upvote`, {
    method: "POST"
  }),
  addSupportComment: (postId, data) => request(`/support/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(data)
  })
};
