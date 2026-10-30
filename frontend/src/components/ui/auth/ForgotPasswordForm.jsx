import React, { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import {
  ArrowLeft,
  ShieldCheck,
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Clock
} from 'lucide-react';

const ForgotPasswordForm = ({ onSwitchToLogin }) => {
  const [step, setStep] = useState(1); // 1: Enter Email, 2: OTP & New Password, 3: Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setInfoMsg('');

    const trimmed = email.trim().toLowerCase();
    const fullEmail = trimmed.includes('@') ? trimmed : `${trimmed}@thapar.edu`;

    if (!fullEmail.endsWith('@thapar.edu')) {
      setError('Only official @thapar.edu email addresses are permitted.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPasswordSendOtp(fullEmail);
      setEmail(fullEmail);
      if (res.otp) {
        setOtp(res.otp);
        setInfoMsg(`Verification code auto-filled: ${res.otp}`);
      } else {
        setInfoMsg(res.message || `Verification code sent to ${fullEmail}`);
      }
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setError('');
    setInfoMsg('');
    setResending(true);
    try {
      const res = await api.forgotPasswordSendOtp(email);
      if (res.otp) {
        setOtp(res.otp);
        setInfoMsg(`New verification code auto-filled: ${res.otp}`);
      } else {
        setInfoMsg(res.message || `A new verification code has been sent to ${email}`);
      }
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    setLoading(true);
    try {
      await api.forgotPasswordReset({
        email,
        otp: otp.trim(),
        newPassword
      });
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please check your verification code.');
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
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  };

  return (
    <div className="auth-login-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'clamp(12px, 2vh, 20px) clamp(20px, 3.5vw, 40px)', boxSizing: 'border-box' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        <button
          onClick={onSwitchToLogin}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 0',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#b91c1c')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
        >
          <ArrowLeft size={15} />
          Back to Sign In
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
          <ShieldCheck size={13} />
          Account Security
        </div>
      </div>

      {/* Center Form Card */}
      <div className="auth-center-content" style={{
        width: '100%',
        maxWidth: '400px',
        margin: 'auto',
        position: 'relative',
        zIndex: 1,
        padding: '12px 0',
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #f1f5f9',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          padding: '28px 24px',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: step === 3 ? '#dcfce7' : '#fee2e2',
              color: step === 3 ? '#15803d' : '#b91c1c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              {step === 3 ? <CheckCircle2 size={24} /> : <KeyRound size={24} />}
            </div>
            <h2 style={{
              fontSize: '19px',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 6px 0',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}>
              {step === 1 && 'Forgot Password'}
              {step === 2 && 'Set New Password'}
              {step === 3 && 'Password Reset Complete!'}
            </h2>
            <p style={{
              fontSize: '12.5px',
              color: '#64748b',
              margin: 0,
              lineHeight: 1.5,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}>
              {step === 1 && 'Enter your verified @thapar.edu email to receive a password reset verification code.'}
              {step === 2 && `Enter the 6-digit code sent to ${email} and create your new password.`}
              {step === 3 && 'Your password has been securely updated. You can now log in with your new credentials.'}
            </p>
          </div>

          {/* Feedback Banners */}
          {error && (
            <div style={{
              padding: '9px 12px',
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '16px',
              lineHeight: 1.4,
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          {infoMsg && step !== 3 && (
            <div style={{
              padding: '9px 12px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              color: '#1e40af',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '16px',
              lineHeight: 1.4,
            }}>
              <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* STEP 1: Email Form */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Thapar Email Address</label>
                <div style={{ position: 'relative' }}>
                  <div style={iconBoxStyle}><Mail size={15} /></div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rollnumber or name@thapar.edu"
                    required
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <span style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Must be your registered institutional @thapar.edu email.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: loading ? '#fca5a5' : '#b91c1c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '4px',
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="spin-animation" />
                    Sending Code...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </button>
            </form>
          )}

          {/* STEP 2: OTP & New Password Form */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 6-Digit Code */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <label style={labelStyle}>6-Digit Verification Code</label>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '11px',
                      color: '#b91c1c',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Change Email
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={iconBoxStyle}><KeyRound size={15} /></div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    style={{
                      ...inputStyle,
                      letterSpacing: '5px',
                      fontWeight: 700,
                      fontSize: '15px',
                    }}
                    autoFocus
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={labelStyle}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <div style={iconBoxStyle}><Lock size={15} /></div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    style={{ ...inputStyle, paddingRight: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <div style={iconBoxStyle}><Lock size={15} /></div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    style={{ ...inputStyle, paddingRight: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      padding: 0,
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <span style={{ fontSize: '10.5px', color: '#dc2626', marginTop: '3px', display: 'block' }}>
                    Passwords do not match.
                  </span>
                )}
              </div>

              {/* Resend Option */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '11.5px', color: '#64748b' }}>
                {resendCooldown > 0 ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> Resend code in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#b91c1c',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '11.5px',
                      textDecoration: 'underline',
                    }}
                  >
                    {resending ? 'Sending...' : 'Didn’t receive code? Resend'}
                  </button>
                )}
              </div>

              {/* Reset Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: loading ? '#fca5a5' : '#b91c1c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '4px',
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="spin-animation" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && (
            <div style={{ textAlign: 'center', paddingTop: '6px' }}>
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '20px',
                fontSize: '12.5px',
                color: '#166534',
                lineHeight: 1.5,
              }}>
                Your password has been changed. You can now use your new password to log in.
              </div>

              <button
                type="button"
                onClick={onSwitchToLogin}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  background: '#b91c1c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  transition: 'background 0.2s',
                }}
              >
                Proceed to Sign In
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        paddingTop: '8px',
        borderTop: '1px solid #f1f5f9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '10.5px',
        color: '#9ca3af',
        position: 'relative',
        zIndex: 2,
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

export default ForgotPasswordForm;
