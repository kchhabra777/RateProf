import teacherPhotos from '../data/teacherPhotos.json';

// Photos and profile links taken from the Thapar department faculty pages, keyed by the teacher's
// user id. The photos are face-centred 320x320 crops served from /public/teachers. Values stored on
// the teacher record (set by admins or approved suggestions) always take precedence.
const lookup = (teacher) => teacherPhotos[teacher?.userId || teacher?.user?.id] || null;

export const getTeacherPhoto = (teacher) => teacher?.photoUrl || lookup(teacher)?.photo || null;

export const getThaparProfileUrl = (teacher) => teacher?.thaparProfileUrl || lookup(teacher)?.profile || null;
