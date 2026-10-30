import React, { useState } from 'react';
import { useClerk, useSignUp } from '@clerk/clerk-react';
import { useAuth } from '../../../context/AuthContext';
import {
  ArrowLeft,
  ShieldCheck,
  GraduationCap,
  User,
  Mail,
  AlertCircle,
  Lock,
} from 'lucide-react';

const SignupForm = ({ onSwitchToLogin }) => {
  const clerk = useClerk();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
  const { authError } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignup = async () => {
    if (!isSignUpLoaded || !signUp) return;
    if (googleLoading) return;
    setGoogleLoading(true);
    setError('');
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.origin + '/',
      });
    } catch (err) {
      setError(err.message || 'Google sign-up failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (!isSignUpLoaded || !signUp) return;

    const fullEmail = email.includes('@') ? email : `${email}@thapar.edu`;

    if (!fullEmail.endsWith('@thapar.edu')) {
      setError('Only @thapar.edu email addresses are allowed.');
      return;
    }

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      localStorage.setItem('signup_fullName', fullName.trim());

      await signUp.create({
        emailAddress: fullEmail,
        password: password,
        firstName: fullName.split(' ')[0],
        lastName: fullName.split(' ').slice(1).join(' ') || '',
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setIsVerifying(true);
    } catch (err) {
      const msg = err.errors?.[0]?.longMessage || err.message || 'Signup failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    if (!isSignUpLoaded || !signUp) return;

    setLoading(true);
    setError('');

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === 'complete') {
        await clerk.setActive({ session: result.createdSessionId });
      } else {
        console.log('Clerk verification result:', result);
        const missing = result.missingFields ? result.missingFields.join(', ') : 'Unknown';
        const unverified = result.unverifiedFields ? result.unverifiedFields.join(', ') : 'Unknown';
        
        if (result.status === 'missing_requirements') {
          setError(`Almost done, but your Clerk dashboard requires a Password. Please enable Passwordless login in Clerk or let me know to add a password field.`);
        } else {
          setError(`Verification incomplete. Status: ${result.status}`);
        }
      }
    } catch (err) {
      const msg = err.errors?.[0]?.longMessage || err.message || 'Verification failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px 8px 36px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#0f172a',
    background: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    boxSizing: 'border-box',
    height: '38px',
  };

  const inputFocusStyle = {
    borderColor: '#b91c1c',
    boxShadow: '0 0 0 3px rgba(185, 28, 28, 0.08)',
  };

  const labelStyle = {
    fontSize: '11.5px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '3px',
    display: 'block',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
  };

  const iconBoxStyle = {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      maxHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: '#ffffff',
      overflowY: 'auto',
      boxSizing: 'border-box',
    }}>
      {/* Decorative Curved Shapes */}
      <div style={{
        position: 'absolute',
        top: '-60px',
        left: '-40px',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-80px',
        right: '-60px',
        width: '240px',
        height: '240px',
        background: 'radial-gradient(circle, rgba(239,68,68,0.03) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Main Content Area */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'clamp(12px, 1.8vh, 18px) clamp(24px, 3.5vw, 40px)',
        maxWidth: '480px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Top Bar: Back to Login + student-project badge */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'clamp(8px, 1.2vh, 14px)',
        }}>
          <button
            onClick={onSwitchToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 0',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.color = '#b91c1c'}
            onMouseLeave={(e) => e.target.style.color = '#64748b'}
          >
            <ArrowLeft size={15} />
            Back to Login
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '16px',
            fontSize: '11.5px',
            fontWeight: 600,
            color: '#b91c1c',
          }}>
            <GraduationCap size={13} />
            Built by TIET students
          </div>
        </div>

        {/* Step Indicator */}
        <div style={{ marginBottom: 'clamp(6px, 1vh, 10px)' }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#94a3b8',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}>
            {isVerifying ? 'STEP 2 OF 2' : 'STEP 1 OF 2'}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <div style={{
              height: '3px',
              flex: 1,
              background: '#ef4444',
              borderRadius: '2px',
            }} />
            <div style={{
              height: '3px',
              flex: 1,
              background: isVerifying ? '#ef4444' : '#e5e7eb',
              borderRadius: '2px',
              transition: 'background 0.3s',
            }} />
          </div>
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: 'clamp(20px, 2.2vw, 24px)',
          fontWeight: 800,
          color: '#0f172a',
          margin: '0 0 2px 0',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          letterSpacing: '-0.02em',
        }}>
          {isVerifying ? 'Verify Your Email' : 'Create Your Account'}
        </h1>
        <p style={{
          fontSize: '12.5px',
          color: '#64748b',
          margin: '0 0 clamp(8px, 1.2vh, 12px) 0',
          lineHeight: 1.35,
        }}>
          {isVerifying
            ? 'Enter the verification code sent to your email.'
            : 'Join RateProf and be part of a better, transparent campus.'}
        </p>

        {/* Error Display */}
        {(error || authError) && (
          <div style={{
            padding: '8px 12px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '12px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '10px',
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error || authError}</span>
          </div>
        )}

        {isVerifying ? (
          /* ============ VERIFICATION FORM ============ */
          <form onSubmit={handleVerification}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Verification Code</label>
              <div style={{ position: 'relative' }}>
                <div style={iconBoxStyle}>
                  <Lock size={15} />
                </div>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  style={inputStyle}
                  onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                background: loading ? '#d1d5db' : '#b91c1c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => { if (!loading) e.target.style.background = '#991b1b'; }}
              onMouseLeave={(e) => { if (!loading) e.target.style.background = '#b91c1c'; }}
            >
              {loading ? 'Verifying...' : 'Verify & Continue →'}
            </button>

            <button
              type="button"
              onClick={() => { setIsVerifying(false); setError(''); setVerificationCode(''); }}
              style={{
                width: '100%',
                marginTop: '8px',
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}
            >
              ← Go back to signup
            </button>
          </form>
        ) : (
          /* ============ SIGNUP FORM ============ */
          <>
            {/* Google Sign-In Button */}
            <button
              onClick={handleGoogleSignup}
              disabled={googleLoading}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                cursor: googleLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                height: '38px',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                if (!googleLoading) {
                  e.currentTarget.style.borderColor = '#b91c1c';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(185, 28, 28, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </button>

            {/* OR Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: 'clamp(6px, 1vh, 10px) 0',
            }}>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#9ca3af',
                letterSpacing: '0.05em',
              }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            </div>

            {/* Sign up with email label */}
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#6b7280',
              marginBottom: '6px',
            }}>
              Sign up with email
            </div>

            <form onSubmit={handleEmailSignup}>
              {/* Full Name */}
              <div style={{ marginBottom: '8px' }}>
                <label style={labelStyle}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <div style={iconBoxStyle}>
                    <User size={15} />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    style={inputStyle}
                    onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>
              </div>

              {/* TIET Email Address */}
              <div style={{ marginBottom: '8px' }}>
                <label style={labelStyle}>TIET Email Address</label>
                <div style={{ position: 'relative', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <div style={iconBoxStyle}>
                      <Mail size={15} />
                    </div>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@thapar.edu"
                      style={inputStyle}
                      onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                      required
                    />
                  </div>
                  <div style={{
                    padding: '6px 10px',
                    background: '#f1f5f9',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                  }}>
                    @thapar.edu
                  </div>
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Create Password</label>
                <div style={{ position: 'relative' }}>
                  <div style={iconBoxStyle}>
                    <Lock size={15} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    style={inputStyle}
                    onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>
              </div>

              {/* CTA Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: loading ? '#d1d5db' : '#b91c1c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  transition: 'background 0.2s, transform 0.1s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  height: '38px',
                  boxShadow: loading ? 'none' : '0 2px 10px rgba(185, 28, 28, 0.22)',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.background = '#991b1b';
                    e.target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.background = '#b91c1c';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loading ? 'Creating Account...' : 'Create Account →'}
              </button>
            </form>

            {/* Already have an account */}
            <div style={{
              textAlign: 'center',
              marginTop: '8px',
              fontSize: '12px',
              color: '#6b7280',
            }}>
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#b91c1c',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  textDecoration: 'none',
                  padding: 0,
                }}
                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
              >
                Sign In
              </button>
            </div>
          </>
        )}

        {/* Security Notice */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: 'clamp(8px, 1.2vh, 12px)',
          padding: '7px 12px',
          background: '#fafafa',
          borderRadius: '8px',
          border: '1px solid #f1f5f9',
        }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ShieldCheck size={14} color="#b91c1c" />
          </div>
          <div>
            <div style={{
              fontSize: '11.5px',
              fontWeight: 600,
              color: '#374151',
              lineHeight: 1.2,
            }}>
              Your data is safe with us.
            </div>
            <div style={{
              fontSize: '10.5px',
              color: '#9ca3af',
              lineHeight: 1.3,
              marginTop: '1px',
            }}>
              Reviews are anonymous to other students and faculty.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px clamp(20px, 3vw, 40px)',
        borderTop: '1px solid #f1f5f9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '10.5px',
        color: '#9ca3af',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}>
        <span>
          RateProf is an independent student project for TIET, Patiala.
          It is not an official university website.
        </span>
      </div>
    </div>
  );
};

export default SignupForm;
