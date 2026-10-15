import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ALLOWED_BATCHES, OFFICIAL_ELECTIVES } from '../api/client';
import { User, GraduationCap, Building, AlertCircle, LogOut, BookOpen } from 'lucide-react';

export const StudentOnboarding = () => {
  const { user, onboardStudent, logout } = useAuth();
  const [fullName, setFullName] = useState(() => {
    const saved = localStorage.getItem('signup_fullName');
    if (saved) localStorage.removeItem('signup_fullName');
    return saved || '';
  });
  const [rollNumber, setRollNumber] = useState(() => {
    const saved = localStorage.getItem('signup_rollNumber');
    if (saved) localStorage.removeItem('signup_rollNumber');
    return saved || '';
  });
  const [branch, setBranch] = useState('COE');
  const [batch, setBatch] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState(3);
  const [selectedDisciplineElective, setSelectedDisciplineElective] = useState('');
  const [selectedFreeElective, setSelectedFreeElective] = useState('');
  const [availableElectives, setAvailableElectives] = useState([]);
  const [autoDetectedNotice, setAutoDetectedNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getElectives().then(res => {
      if (res.electives && res.electives.length > 0) {
        setAvailableElectives(res.electives);
      }
    }).catch(err => {
      console.warn("Could not load electives in onboarding:", err);
    });
  }, []);

  const handleRollNumberChange = (val) => {
    const clean = val.replace(/\D/g, '');
    setRollNumber(clean);

    if (clean.length >= 8) {
      // Automatic Thapar batch detection: 10 + YY + DD + SSS
      const yrCode = clean.slice(2, 4);
      const dept = clean.slice(4, 6);
      const serial = parseInt(clean.slice(-3), 10) || 1;
      
      let detectedBranch = branch;
      let letter = "Q"; // default
      let branchName = "Computer Science & Engineering – Patiala (COPC)";

      if (dept === "03") {
        detectedBranch = "COE";
        letter = "C";
        branchName = "Computer Engineering (COE)";
      } else if (dept === "17" || dept === "01") {
        detectedBranch = "COPC";
        letter = "Q";
        branchName = "Computer Science & Engineering – Patiala (COPC)";
      } else if (dept === "04") {
        detectedBranch = "ECE";
        letter = "F";
        branchName = "Electronics & Communication Engineering (ECE)";
      } else if (dept === "15") {
        detectedBranch = "ENC";
        letter = "O";
        branchName = "Electronics & Computer Engineering (ENC)";
      } else if (dept === "05") {
        detectedBranch = "ELE";
        letter = "D";
        branchName = "Electrical Engineering (ELE)";
      } else if (dept === "06") {
        detectedBranch = "ME";
        letter = "H";
        branchName = "Mechanical Engineering";
      } else if (dept === "18") {
        detectedBranch = "EVD";
        letter = "V";
        branchName = "Electronics Engineering – VLSI Design & Technology (EVD)";
      } else if (dept === "08") {
        detectedBranch = "CHE";
        letter = "B";
        branchName = "Chemical Engineering";
      } else if (dept === "09") {
        detectedBranch = "CE";
        letter = "A";
        branchName = "Civil Engineering";
      } else if (dept === "10") {
        detectedBranch = "BT";
        letter = "U";
        branchName = "Biotechnology";
      } else if (dept === "83") {
        detectedBranch = "COE";
        letter = "X";
        branchName = "Computer Engineering (LEET)";
      }
      
      let year = 3;
      if (yrCode === "26") year = 1;
      else if (yrCode === "25") year = 2;
      else if (yrCode === "24") year = 3;
      else if (yrCode === "23") year = 4;
      else if (parseInt(yrCode, 10) < 23) year = 4;
      else year = 1;

      const sub = Math.min(Math.max(Math.ceil((serial % 50) / 10) || 1, 1), 8);
      const autoBatch = year === 1 
        ? (serial % 2 === 0 ? `1B1${sub}` : `1A1${sub}`)
        : `${year}${letter}1${sub}`;

      setBranch(detectedBranch);
      setYearOfStudy(year);
      if (!batch) setBatch(autoBatch);
      setAutoDetectedNotice(`✨ Automatically detected Branch: ${branchName} (Year ${year}) from your roll number.`);
    } else {
      setAutoDetectedNotice('');
    }
  };

  const handleBatchChange = (newBatch) => {
    setBatch(newBatch);
    const upperBatch = newBatch.toUpperCase();
    if (upperBatch.startsWith('4')) setYearOfStudy(4);
    else if (upperBatch.startsWith('3')) setYearOfStudy(3);
    else if (upperBatch.startsWith('2')) setYearOfStudy(2);
    else if (upperBatch.startsWith('1')) setYearOfStudy(1);

    if (upperBatch.includes('Q')) {
      setBranch('COPC');
      setAutoDetectedNotice('✨ Automatically mapped Branch to COPC based on batch Q.');
    } else if (upperBatch.includes('C')) {
      setBranch('COE');
      setAutoDetectedNotice('✨ Automatically mapped Branch to COE based on batch C.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!/^\d{9,10}$/.test(rollNumber.trim())) {
      setError("Roll Number must be 9 or 10 numeric digits (e.g. 1024031234 or 102103123).");
      return;
    }

    setLoading(true);
    setError('');

    const electivesToSave = [];
    if (Number(yearOfStudy) >= 3) {
      if (selectedDisciplineElective) electivesToSave.push(selectedDisciplineElective);
      if (selectedFreeElective) electivesToSave.push(selectedFreeElective);
    }

    try {
      await onboardStudent({
        fullName: fullName.trim(),
        rollNumber: rollNumber.trim(),
        branch,
        batch: batch.toUpperCase(),
        yearOfStudy: Number(yearOfStudy),
        selectedElectives: electivesToSave
      });
    } catch (err) {
      setError(err.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'var(--bg-main)' }}>
      {/* Top Bar with Sign Out / Switch Account */}
      <div style={{ width: '100%', maxWidth: '480px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Signed in as: <strong style={{ color: 'var(--text-primary)' }}>{user?.email || 'Student'}</strong>
        </span>
        <button
          type="button"
          onClick={logout}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 8px',
            borderRadius: '6px'
          }}
          title="Sign out and return to login page"
        >
          <LogOut size={14} />
          <span>Switch Account</span>
        </button>
      </div>

      <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '32px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="badge badge-student" style={{ fontSize: '13px', marginBottom: '12px' }}>
            <GraduationCap size={15} />
            <span>Student Profile Setup</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Complete Your Student Profile</h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Enter your student details for verified campus transparency.
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Robin Singh"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          {/* University Roll Number (9 or 10 Digits) */}
          <div className="form-group">
            <label className="form-label">University Roll Number (9 or 10 Digits) *</label>
            <input
              type="text"
              maxLength={10}
              className="form-input"
              placeholder="e.g. 1024170003 or 102103123"
              value={rollNumber}
              onChange={(e) => handleRollNumberChange(e.target.value)}
              required
              pattern="\d{9,10}"
              title="Must be 9 or 10 numeric digits"
            />
            {autoDetectedNotice ? (
              <div style={{
                marginTop: '6px',
                padding: '6px 10px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#10b981',
                fontSize: '12px',
                fontWeight: 600
              }}>
                {autoDetectedNotice}
              </div>
            ) : (
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Must be 9 or 10 numeric digits as issued on your University / Thapar ID card.
              </span>
            )}
          </div>

          {/* Branch */}
          <div className="form-group">
            <label className="form-label">Engineering Branch *</label>
            <select
              className="form-select"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              required
            >
              <optgroup label="💻 Computer / AI">
                <option value="COE">Computer Engineering (COE)</option>
                <option value="COPC">Computer Science & Engineering – Patiala (COPC)</option>
                <option value="COSE">Computer Science & Engineering – Dera Bassi (COSE)</option>
                <option value="COBS">Computer Science & Business Systems (COBS)</option>
                <option value="DSAI">Artificial Intelligence & Data Science (DSAI)</option>
                <option value="AIML">Artificial Intelligence & Machine Learning (AIML)</option>
                <option value="RAI">Robotics & Artificial Intelligence (RAI)</option>
                <option value="ENC">Electronics & Computer Engineering (ENC)</option>
                <option value="EEC">Electrical & Computer Engineering (EEC)</option>
              </optgroup>
              <optgroup label="⚡ Electronics / Electrical">
                <option value="ECE">Electronics & Communication Engineering (ECE)</option>
                <option value="EVD">Electronics Engineering – VLSI Design & Technology (EVD)</option>
                <option value="ELE">Electrical Engineering (ELE)</option>
                <option value="EIC">Electronics (Instrumentation & Control) Engineering (EIC)</option>
              </optgroup>
              <optgroup label="⚙️ Core Engineering">
                <option value="ME">Mechanical Engineering</option>
                <option value="MEC">Mechatronics Engineering</option>
                <option value="CE">Civil Engineering</option>
                <option value="CHE">Chemical Engineering</option>
              </optgroup>
              <optgroup label="🧬 Bio / Other">
                <option value="BT">Biotechnology</option>
                <option value="BME">Biomedical Engineering</option>
              </optgroup>
            </select>
          </div>

          {/* Batch Group / Sub-group */}
          <div className="form-group">
            <label className="form-label">Batch Group / Sub-group *</label>
            <input
              type="text"
              list="batch-list"
              className="form-input"
              placeholder="e.g. 3Q11, 3C11, 2C11, 1A11, 4C11"
              value={batch}
              onChange={(e) => handleBatchChange(e.target.value.toUpperCase().trim())}
              required
            />
            <datalist id="batch-list">
              <option value="3Q11" />
              <option value="3Q12" />
              <option value="3Q13" />
              <option value="3C11" />
              <option value="3C12" />
              <option value="2Q11" />
              <option value="2C11" />
              <option value="1A11" />
              <option value="1B11" />
              <option value="4C11" />
              <option value="4Q11" />
            </datalist>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Enter your specific tutorial/practical subgroup (e.g., 3Q11, 4C23).
            </span>
          </div>

          {/* Year of Study */}
          <div className="form-group">
            <label className="form-label">Year of Study *</label>
            <select
              className="form-select"
              value={yearOfStudy}
              onChange={(e) => {
                const yr = Number(e.target.value);
                setYearOfStudy(yr);
                if (yr < 3) {
                  setSelectedDisciplineElective('');
                  setSelectedFreeElective('');
                }
              }}
              required
            >
              <option value={1}>1st Year (Fresher)</option>
              <option value={2}>2nd Year (Sophomore)</option>
              <option value={3}>3rd Year (Junior)</option>
              <option value={4}>4th Year (Senior / Final)</option>
            </select>
          </div>

          {/* Electives Selection (3rd & 4th Year Only) */}
          {yearOfStudy >= 3 ? (
            <div className="form-group" style={{ background: 'var(--bg-card-subtle)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <BookOpen size={18} style={{ color: 'var(--primary)' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Semester Electives (Optional)</h4>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>As allocated in your Webkiosk portal</span>
                </div>
              </div>

              {/* Discipline Elective [EL-1] */}
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Discipline Elective [EL-1]
                </label>
                <select
                  className="form-select"
                  value={selectedDisciplineElective}
                  onChange={(e) => setSelectedDisciplineElective(e.target.value)}
                >
                  <option value="">None / No Discipline Elective</option>
                  {OFFICIAL_ELECTIVES.disciplineElectives.map(el => (
                    <option key={el.code} value={el.code}>
                      {el.code} - {el.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Free Elective */}
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Free Elective (Open Elective)
                </label>
                <select
                  className="form-select"
                  value={selectedFreeElective}
                  onChange={(e) => setSelectedFreeElective(e.target.value)}
                >
                  <option value="">None / No Free Elective</option>
                  {OFFICIAL_ELECTIVES.freeElectives.map(el => (
                    <option key={el.code} value={el.code}>
                      {el.code} - {el.name}
                    </option>
                  ))}
                </select>
              </div>

              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '10px' }}>
                Only faculty teaching your chosen electives (along with your core batch faculty) will appear in your review list. You can leave either as <strong>None</strong> and change anytime from your dashboard.
              </span>
            </div>
          ) : (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              💡 <strong>1st &amp; 2nd Year Curriculum:</strong> Fixed core subjects only (No electives applicable).
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '16px' }}
          >
            {loading ? "Saving Profile..." : "Save & Enter Student Portal"}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Already completed setup on another account?{' '}
            <button
              type="button"
              onClick={logout}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--primary)',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
                fontSize: '13px'
              }}
            >
              Sign out &amp; Log In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
