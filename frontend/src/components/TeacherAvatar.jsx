import React, { useState } from 'react';
import { getTeacherPhoto } from '../utils/teacherMedia';

const HONORIFIC = /^(dr|prof|professor|mr|mrs|ms|er)\.?$/i;

// "Dr. Manpreet Singh" -> "MS", "Akanksha Saxena" -> "AS", "Vishwajeet" -> "V"
export const teacherInitials = (teacher) => {
  const name = teacher?.fullName || teacher?.name || teacher?.code || '';
  const words = name.split(/\s+/).filter(w => w && !HONORIFIC.test(w));
  const firstChar = (w) => w?.match(/[A-Za-z0-9]/)?.[0] || '';
  const letters = words.length > 1 ? firstChar(words[0]) + firstChar(words[words.length - 1]) : firstChar(words[0]);
  return (letters || 'F').toUpperCase();
};

/**
 * A teacher's photo in a circular frame, or, when there is no photo (or it fails to load),
 * a red rounded-square tile with the teacher's initial. `className` / `style` describe the
 * frame (size, ring); `imgStyle` is applied to the photo inside it.
 */
export function TeacherAvatar({ teacher, className = '', style, imgStyle, lazy = false }) {
  const photo = getTeacherPhoto(teacher);
  // Remember which URL failed, so switching to another teacher tries their photo again
  const [failedSrc, setFailedSrc] = useState(null);

  if (!photo || failedSrc === photo) {
    // Keep only the frame's size and placement; the tile has its own shape and colours
    const { width, height, flexShrink, margin } = style || {};
    const initials = teacherInitials(teacher);
    return (
      <div
        className={`${className} teacher-initial-tile`.trim()}
        style={{ width, height, flexShrink, margin }}
        role="img"
        aria-label={teacher?.fullName || 'Faculty'}
      >
        <span data-count={initials.length}>{initials}</span>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <img
        src={photo}
        alt={teacher?.fullName || 'Faculty'}
        loading={lazy ? 'lazy' : undefined}
        decoding="async"
        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', ...imgStyle }}
        onError={() => setFailedSrc(photo)}
      />
    </div>
  );
}
