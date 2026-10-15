import React, { useState, useRef } from 'react';
import { api } from '../api/client';
import { 
  Sparkles, Crown, X, CheckCircle2, AlertCircle, BookOpen, 
  Layers, Hash, Users, Briefcase, FileText, ChevronDown, 
  User, Building2, MapPin, Globe, Image, Check, Clock, Upload, Trash2, ExternalLink
} from 'lucide-react';

export const SuggestTeacherModal = ({ teacher, isOpen, onClose, isCR = false, studentBatch = '', onSuccess }) => {
  if (!isOpen || !teacher) return null;

  const teacherCourses = teacher.courses || teacher.offerings || [];
  const primaryCourse = teacherCourses[0] || {};
  const teacherId = teacher.userId || teacher.user?.id || teacher.id;

  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState(teacher.department || 'CSED');
  const [selectedCourseId, setSelectedCourseId] = useState(primaryCourse.id || (teacherCourses.length > 0 ? teacherCourses[0].id : 'NEW_COURSE'));
  const [courseCode, setCourseCode] = useState(primaryCourse.courseCode || '');
  const [courseName, setCourseName] = useState(primaryCourse.courseName || '');
  const [courseLtp, setCourseLtp] = useState(primaryCourse.ltp || 'L');
  const [courseBatch, setCourseBatch] = useState(primaryCourse.batchTaught || '');
  const [courseBranch, setCourseBranch] = useState(primaryCourse.branchTaught || '');
  const [roomNo, setRoomNo] = useState('');
  const [linkedIn, setLinkedIn] = useState(teacher.linkedIn || '');
  const [thaparProfileUrl, setThaparProfileUrl] = useState(teacher.thaparProfileUrl || '');
  const [photoUrl, setPhotoUrl] = useState(teacher.photoUrl || '');
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('course'); // 'course' | 'profile' default to course as requested

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedCourse = selectedCourseId !== 'NEW_COURSE' 
      ? teacherCourses.find(c => c.id === selectedCourseId) || {} 
      : {};

    const payload = {
      suggestedName: (fullName.trim() !== (teacher.fullName || teacher.name || '')) ? fullName.trim() : undefined,
      suggestedDept: (department.trim() !== (teacher.department || '')) ? department.trim() : undefined,
      notes: notes.trim() || undefined,
      suggestedCourseCode: (courseCode.trim() !== (selectedCourse.courseCode || '')) ? courseCode.trim() : undefined,
      suggestedCourseName: (courseName.trim() !== (selectedCourse.courseName || '')) ? courseName.trim() : undefined,
      suggestedLtp: (courseLtp !== (selectedCourse.ltp || 'L')) ? courseLtp : undefined,
      suggestedBatchTaught: (courseBatch.trim() !== (selectedCourse.batchTaught || '')) ? courseBatch.trim() : undefined,
      suggestedBranchTaught: (courseBranch.trim() !== (selectedCourse.branchTaught || '')) ? courseBranch.trim() : undefined,
      courseOfferingId: (!selectedCourseId || selectedCourseId === 'NEW_COURSE') ? undefined : selectedCourseId,
      suggestedRoomNo: (roomNo.trim() !== (teacher.roomNumber || '')) ? roomNo.trim() : undefined,
      suggestedLinkedIn: (linkedIn.trim() !== (teacher.linkedIn || '')) ? linkedIn.trim() : undefined,
      suggestedThaparProfileUrl: (thaparProfileUrl.trim() !== (teacher.thaparProfileUrl || '')) ? thaparProfileUrl.trim() : undefined,
      suggestedPhotoUrl: (photoUrl.trim() !== (teacher.photoUrl || '')) ? photoUrl.trim() : undefined
    };

    // Check if any actual data fields have changed (excluding courseOfferingId which just provides context)
    const { courseOfferingId, ...dataFields } = payload;
    const hasAnyChange = Object.values(dataFields).some(val => val !== undefined && val !== '');

    if (!hasAnyChange) {
      setError("Please provide at least one new detail or correction before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {

      const res = await api.suggestTeacherName(teacherId, payload);

      if (onSuccess) {
        onSuccess(res.message || "Thank you! Submission received for verification.");
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to submit suggestion. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getLtpBadge = (ltp) => {
    switch(ltp) {
      case 'L': return { label: 'Lecture (L)', bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.35)', icon: '📖' };
      case 'P': return { label: 'Practical (P)', bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.35)', icon: '🧪' };
      case 'T': return { label: 'Tutorial (T)', bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.35)', icon: '✏️' };
      default: return { label: ltp, bg: 'var(--border-light)', text: '#fff', border: 'rgba(255, 255, 255, 0.2)', icon: '📌' };
    }
  };

  const compressImage = (file, maxDim = 600, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Image failed to load'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, etc.).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10 MB.');
      return;
    }
    setError(null);
    try {
      const compressed = await compressImage(file);
      setPhotoUrl(compressed);
      setPhotoPreview(compressed);
    } catch (err) {
      // Fallback to direct data URL if canvas resize fails (the API accepts bodies up to 2 MB)
      if (file.size > 1.4 * 1024 * 1024) {
        setError('Could not compress this image. Please pick one under 1.4 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoUrl(ev.target.result);
        setPhotoPreview(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoUrl('');
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const currentBadge = getLtpBadge(courseLtp);

  const handleBatchChange = (e) => {
    const val = e.target.value.toUpperCase();
    setCourseBatch(val);

    const match = val.match(/[A-Z]/);
    if (match) {
      const letter = match[0];
      const mapping = {
        'Q': 'COPC',
        'C': 'COE',
        'E': 'ENC',
        'M': 'MEE',
        'B': 'BT',
        'X': 'CHE',
        'R': 'CIE',
        'P': 'PIE',
        'L': 'ELE'
      };
      
      const mapped = mapping[letter];
      if (mapped && (!courseBranch || Object.values(mapping).includes(courseBranch))) {
        setCourseBranch(mapped);
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>

        {/* Close button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '18px', right: '18px',
            background: 'var(--bg-main)', border: '1px solid rgba(255, 255, 255, 0.1)', 
            color: 'var(--text-secondary)', borderRadius: '50%', width: '34px', height: '34px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10, transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-main)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <X size={17} />
        </button>

        {/* Modal Header */}
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '13px',
              background: isCR 
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.35))' 
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.35))',
              border: isCR ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isCR ? '#fbbf24' : '#ef4444',
              boxShadow: isCR ? '0 4px 16px rgba(245, 158, 11, 0.15)' : '0 4px 16px rgba(239, 68, 68, 0.15)'
            }}>
              {isCR ? <Crown size={22} /> : <Sparkles size={22} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {isCR ? "CR Faculty & Curriculum Portal" : "Faculty & Course Verification"}
                </h3>
                {isCR && (
                  <span style={{ 
                    fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', 
                    border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 7px', borderRadius: '6px' 
                  }}>
                    CR Priority
                  </span>
                )}
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                Curating information for <strong style={{ color: '#f4f4f5' }}>{teacher.fullName}</strong>
              </span>
            </div>
          </div>

          {/* Segmented Tab Navigation */}
          <div style={{ 
            display: 'flex', gap: '6px', marginTop: '16px', 
            background: 'var(--bg-card-subtle)', padding: '4px', borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('course')}
              style={{
                flex: 1, padding: '8px 14px', borderRadius: '9px', fontSize: '13px', fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                background: activeTab === 'course' ? 'var(--border-light)' : 'transparent',
                color: activeTab === 'course' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'course' ? '0 2px 10px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.12)' : 'none'
              }}
            >
              <BookOpen size={15} color={activeTab === 'course' ? '#ef4444' : 'var(--text-muted)'} />
              <span>Courses & Batches</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              style={{
                flex: 1, padding: '8px 14px', borderRadius: '9px', fontSize: '13px', fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                background: activeTab === 'profile' ? 'var(--border-light)' : 'transparent',
                color: activeTab === 'profile' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'profile' ? '0 2px 10px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.12)' : 'none'
              }}
            >
              <User size={15} color={activeTab === 'profile' ? '#ef4444' : 'var(--text-muted)'} />
              <span>Profile Info</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '22px 28px', overflowY: 'auto', flex: 1 }}>
          {/* CR Highlight Banner */}
          {isCR && (
            <div style={{
              marginBottom: '18px', padding: '12px 15px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.04) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#fbbf24'
            }}>
              <Crown size={18} style={{ flexShrink: 0, color: '#f59e0b' }} />
              <div>
                <strong>Batch {studentBatch} CR Authority:</strong> Submissions receive instant <strong>CR Verified</strong> status.
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* TAB: Course & Subject Correction */}
            {activeTab === 'course' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  padding: '20px', borderRadius: '16px',
                  background: 'var(--bg-main)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 30px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                }}>
                  {/* Card Section Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '9px',
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.15))',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#ef4444', flexShrink: 0
                      }}>
                        <BookOpen size={16} />
                      </div>
                      <div>
                        <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', display: 'block' }}>
                          Course & Subject Correction
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          Configure course code, class format, batch & branch
                        </span>
                      </div>
                    </div>
                    {isCR && (
                      <span style={{ 
                        background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', 
                        border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '11px', fontWeight: 600,
                        padding: '3px 8px', borderRadius: '6px'
                      }}>
                        CR Editable
                      </span>
                    )}
                  </div>

                  {/* Course Offering Dropdown Selector */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '7px', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Layers size={13} color="#ef4444" />
                        <span>Select Course Offering to Correct (or Add New):</span>
                      </span>
                      {selectedCourseId !== 'NEW_COURSE' ? (
                        <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 500 }}>Editing Existing</span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 500 }}>New Course</span>
                      )}
                    </label>

                    <div style={{ position: 'relative' }}>
                      <select
                        style={{
                          width: '100%',
                          fontSize: '13.5px',
                          padding: '10px 36px 10px 14px',
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '10px',
                          color: '#f4f4f5',
                          outline: 'none',
                          cursor: 'pointer',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.4)'
                        }}
                        value={selectedCourseId}
                        onChange={(e) => {
                          const cId = e.target.value;
                          setSelectedCourseId(cId);
                          if (cId === 'NEW_COURSE') {
                            setCourseCode('');
                            setCourseName('');
                            setCourseLtp('L');
                            setCourseBatch('');
                            setCourseBranch('');
                          } else {
                            const match = teacherCourses.find(c => c.id === cId);
                            if (match) {
                              setCourseCode(match.courseCode || '');
                              setCourseName(match.courseName || '');
                              setCourseLtp(match.ltp || 'L');
                              setCourseBatch(match.batchTaught || '');
                              setCourseBranch(match.branchTaught || '');
                            }
                          }
                        }}
                      >
                        <option value="NEW_COURSE" style={{ background: '#18181b', color: '#34d399' }}>
                          ➕ Suggest New Course / Batch
                        </option>
                        {teacherCourses.map((c) => (
                          <option key={c.id} value={c.id} style={{ background: '#18181b', color: '#f4f4f5' }}>
                            {c.courseCode} — {c.courseName || c.courseCode} [{c.ltp || 'L'}]
                          </option>
                        ))}
                      </select>
                      <ChevronDown 
                        size={16} 
                        style={{ 
                          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', 
                          color: 'var(--text-muted)', pointerEvents: 'none' 
                        }} 
                      />
                    </div>
                  </div>

                  {/* Course Code & LTP Segmented Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr', gap: '14px', marginBottom: '14px' }}>
                    {/* Course Code */}
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '7px', fontWeight: 600 }}>
                        <Hash size={13} color="#a1a1aa" />
                        <span>Course Code</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          style={{
                            width: '100%',
                            fontSize: '13.5px',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            padding: '10px 14px',
                            background: 'var(--bg-card-subtle)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '10px',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.4)',
                            transition: 'border-color 0.2s, box-shadow 0.2s'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = 'rgba(239, 68, 68, 0.6)';
                            e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15), inset 0 1px 3px rgba(0, 0, 0, 0.4)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                            e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.4)';
                          }}
                          placeholder="e.g. UCS553"
                          value={courseCode}
                          onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                        />
                      </div>
                    </div>

                    {/* Class Type LTP Tactile Segmented Control */}
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '7px', fontWeight: 600 }}>
                        <Clock size={13} color="#a1a1aa" />
                        <span>Class Type (LTP)</span>
                      </label>
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px',
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        padding: '3px', borderRadius: '10px'
                      }}>
                        {[
                          { val: 'L', label: 'Lec', full: 'Lecture', color: '#60a5fa', activeBg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.4)' },
                          { val: 'P', label: 'Lab', full: 'Practical', color: '#34d399', activeBg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.4)' },
                          { val: 'T', label: 'Tut', full: 'Tutorial', color: '#fbbf24', activeBg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)' }
                        ].map((opt) => {
                          const isActive = courseLtp === opt.val;
                          return (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setCourseLtp(opt.val)}
                              title={opt.full}
                              style={{
                                padding: '7px 0',
                                borderRadius: '7px',
                                fontSize: '12px',
                                fontWeight: isActive ? 700 : 500,
                                border: isActive ? `1px solid ${opt.border}` : '1px solid transparent',
                                background: isActive ? opt.activeBg : 'transparent',
                                color: isActive ? opt.color : 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px'
                              }}
                            >
                              <span>{opt.label}</span>
                              <span style={{ fontSize: '10px', opacity: 0.7 }}>({opt.val})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Course Title */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '7px', fontWeight: 600 }}>
                      <FileText size={13} color="#a1a1aa" />
                      <span>Course Title</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      style={{
                        width: '100%',
                        fontSize: '13.5px',
                        padding: '10px 14px',
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '10px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.4)',
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(239, 68, 68, 0.6)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15), inset 0 1px 3px rgba(0, 0, 0, 0.4)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                        e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.4)';
                      }}
                      placeholder="e.g. ENTERPRISE WEB APPLICATION"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                    />
                  </div>

                  {/* Batch & Branch Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '7px', fontWeight: 600 }}>
                        <Users size={13} color="#a1a1aa" />
                        <span>Batch Taught</span>
                      </label>
                      <input
                        type="text"
                        style={{
                          width: '100%',
                          fontSize: '13.5px',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontWeight: 600,
                          padding: '10px 14px',
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '10px',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.4)',
                          transition: 'border-color 0.2s, box-shadow 0.2s'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'rgba(239, 68, 68, 0.6)';
                          e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15), inset 0 1px 3px rgba(0, 0, 0, 0.4)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                          e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.4)';
                        }}
                        placeholder="e.g. 3C75 or ALL"
                        value={courseBatch}
                        onChange={handleBatchChange}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '7px', fontWeight: 600 }}>
                        <Briefcase size={13} color="#a1a1aa" />
                        <span>Branch Taught</span>
                      </label>
                      <input
                        type="text"
                        style={{
                          width: '100%',
                          fontSize: '13.5px',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontWeight: 600,
                          padding: '10px 14px',
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '10px',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.4)',
                          transition: 'border-color 0.2s, box-shadow 0.2s'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'rgba(239, 68, 68, 0.6)';
                          e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15), inset 0 1px 3px rgba(0, 0, 0, 0.4)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                          e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.4)';
                        }}
                        placeholder="e.g. COE"
                        value={courseBranch}
                        onChange={(e) => setCourseBranch(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  {/* Live Interactive Preview Pill Bar */}
                  {(courseCode.trim() || courseName.trim() || courseBatch.trim()) && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'var(--bg-main)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontWeight: 700,
                          fontSize: '12px',
                          color: 'var(--text-primary)',
                          background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          letterSpacing: '0.04em'
                        }}>
                          {courseCode.trim() || "CODE"}
                        </span>
                        <span style={{ 
                          fontSize: '13px', fontWeight: 600, color: '#f4f4f5', 
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                        }}>
                          {courseName.trim() || "Course Name"}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 600,
                          background: currentBadge.bg, color: currentBadge.text, border: `1px solid ${currentBadge.border}`,
                          padding: '2px 8px', borderRadius: '6px'
                        }}>
                          {currentBadge.icon} {currentBadge.label}
                        </span>
                        {courseBatch.trim() && (
                          <span style={{
                            fontSize: '11px', fontWeight: 600,
                            background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '2px 7px', borderRadius: '6px'
                          }}>
                            {courseBatch.trim()}
                          </span>
                        )}
                        {courseBranch.trim() && (
                          <span style={{
                            fontSize: '11px', fontWeight: 600,
                            background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)',
                            padding: '2px 7px', borderRadius: '6px'
                          }}>
                            {courseBranch.trim()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Note */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>
                    Source / Verification Note (Optional)
                  </label>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      fontSize: '13px',
                      padding: '10px 14px',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                    placeholder="e.g. Course timetable, Announced in lecture slot"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* TAB: Profile Info */}
            {activeTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  padding: '20px', borderRadius: '16px',
                  background: 'var(--bg-main)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 30px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                }}>
                  {Boolean(teacher.fullName || teacher.name) && Boolean(teacher.department) && Boolean(teacher.roomNumber) && Boolean(teacher.linkedIn) && Boolean(teacher.thaparProfileUrl) && Boolean(teacher.photoUrl) && (
                    <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
                      <div style={{ fontWeight: 600, color: '#f4f4f5', marginBottom: '6px', fontSize: '15px' }}>Profile Fully Verified</div>
                      <div>Thank you! All profile details for this professor have already been crowdsourced and approved.</div>
                    </div>
                  )}
                  {!(teacher.fullName || teacher.name) && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>
                        <User size={13} color="#ef4444" />
                        <span>Professor's Verified Full Name</span>
                        <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        style={{
                          width: '100%',
                          fontSize: '13.5px',
                          padding: '10px 14px',
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '10px',
                          color: 'var(--text-primary)',
                          outline: 'none'
                        }}
                        placeholder="e.g. Dr. Rajesh Kumar Sharma"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoFocus
                      />
                    </div>
                  )}

                  {!teacher.department && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>
                        <Building2 size={13} color="#a1a1aa" />
                        <span>Department</span>
                      </label>
                      <input
                        type="text"
                        style={{
                          width: '100%',
                          fontSize: '13.5px',
                          padding: '10px 14px',
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '10px',
                          color: 'var(--text-primary)',
                          outline: 'none'
                        }}
                        placeholder="e.g. Computer Science & Engineering"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      />
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                    {!teacher.roomNumber && (
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>
                          <MapPin size={13} color="#a1a1aa" />
                          <span>Room / Cabin No.</span>
                        </label>
                        <input
                          type="text"
                          style={{
                            width: '100%',
                            fontSize: '13.5px',
                            padding: '10px 14px',
                            background: 'var(--bg-card-subtle)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '10px',
                            color: 'var(--text-primary)',
                            outline: 'none'
                          }}
                          placeholder="e.g. F-Block 402"
                          value={roomNo}
                          onChange={(e) => setRoomNo(e.target.value)}
                        />
                      </div>
                    )}
                    {!teacher.linkedIn && (
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>
                          <Globe size={13} color="#a1a1aa" />
                          <span>LinkedIn URL</span>
                        </label>
                        <input
                          type="url"
                          style={{
                            width: '100%',
                            fontSize: '13.5px',
                            padding: '10px 14px',
                            background: 'var(--bg-card-subtle)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '10px',
                            color: 'var(--text-primary)',
                            outline: 'none'
                          }}
                          placeholder="https://linkedin.com/in/..."
                          value={linkedIn}
                          onChange={(e) => setLinkedIn(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {!teacher.thaparProfileUrl && (
                    <div style={{
                      marginBottom: '16px',
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <a
                          href={thaparProfileUrl.trim() || `https://www.google.com/search?q=${encodeURIComponent(`site:thapar.edu "${teacher.fullName || teacher.name || ''}"`)}&btnI=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            fontSize: '12px', color: 'var(--text-primary)', textDecoration: 'none',
                            fontWeight: 700, padding: '5px 12px', borderRadius: '8px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
                            cursor: 'pointer'
                          }}
                        >
                          <ExternalLink size={13} />
                          <span>Read About Your Teacher ↗</span>
                        </a>
                      </div>
                      <input
                        type="url"
                        style={{
                          width: '100%',
                          fontSize: '13px',
                          padding: '9px 12px',
                          background: 'rgba(10, 10, 12, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '9px',
                          color: 'var(--text-primary)',
                          outline: 'none'
                        }}
                        placeholder="e.g. https://csed.thapar.edu/facultydetails/MTY2NA=="
                        value={thaparProfileUrl}
                        onChange={(e) => setThaparProfileUrl(e.target.value)}
                      />
                    </div>
                  )}

                  {!teacher.photoUrl && (
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>
                        <Image size={13} color="#a1a1aa" />
                        <span>Upload Photo (Optional)</span>
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        style={{ display: 'none' }}
                      />
                      {photoPreview ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '10px 14px',
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '10px'
                        }}>
                          <img
                            src={photoPreview}
                            alt="Preview"
                            style={{
                              width: '44px', height: '44px',
                              borderRadius: '8px', objectFit: 'cover',
                              border: '1px solid rgba(255, 255, 255, 0.15)'
                            }}
                          />
                          <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Photo selected
                          </span>
                          <button
                            type="button"
                            onClick={removePhoto}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '8px',
                              padding: '6px',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
                            title="Remove photo"
                          >
                            <Trash2 size={14} color="#f87171" />
                          </button>
                        </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          width: '100%',
                          padding: '14px',
                          background: 'rgba(10, 10, 12, 0.5)',
                          border: '1.5px dashed rgba(255, 255, 255, 0.15)',
                          borderRadius: '10px',
                          color: 'var(--text-muted)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)'; e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.background = 'rgba(139, 92, 246, 0.06)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(10, 10, 12, 0.5)'; }}
                      >
                        <Upload size={15} />
                        <span>Click to upload photo</span>
                        <span style={{ fontSize: '11px', opacity: 0.6 }}>JPG, PNG · Auto-optimized</span>
                      </button>
                    )}
                  </div>
                )}
                </div>
              </div>
            )}

            {/* Thapar Profile URL input is inside the Profile Info tab now */}

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              <button
                type="button"
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  background: 'var(--bg-main)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#d4d4d8', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border-light)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-main)'}
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  flex: 1.4, padding: '12px', borderRadius: '12px',
                  background: isCR 
                    ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' 
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  color: 'var(--text-primary)', fontSize: '14px', fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: isCR 
                    ? '0 6px 20px -3px rgba(217, 119, 6, 0.4)' 
                    : '0 6px 20px -3px rgba(239, 68, 68, 0.45)',
                  opacity: submitting ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!submitting) e.currentTarget.style.filter = 'brightness(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'none';
                }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <>
                    {isCR ? <Crown size={16} /> : <Check size={16} />}
                    <span>{isCR ? "Submit as Verified CR" : "Submit Correction"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


