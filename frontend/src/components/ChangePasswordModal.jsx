import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  X,
  ShieldCheck,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

export const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: Send Code, 2: Enter Code & New Password, 3: Success
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccessMsg('');
      setResendCooldown(0);
    }
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.changePasswordSendOtp();
      toast.success(res.message || 'Verification code sent to your email!');
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || 'Failed to send verification code. Please try again.');
      toast.error(err.message || 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setError('');
    setResending(true);
    try {
      const res = await api.changePasswordSendOtp();
      toast.success(res.message || 'New verification code sent!');
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
      toast.error(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  const handleUpdatePassword = async (e) => {
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
      const res = await api.changePassword({
        otp: otp.trim(),
        newPassword
      });
      setSuccessMsg(res.message || 'Password changed successfully!');
      toast.success('Your password has been securely updated!');
      setStep(3);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to update password. Please check your verification code.');
      toast.error(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '9px 12px 9px 38px',
    border: '1.5px solid var(--border-light, #e2e8f0)',
    borderRadius: '10px',
    fontSize: '13.5px',
    color: 'var(--text-primary, #0f172a)',
    background: 'var(--bg-main, #ffffff)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    height: '42px',
  };

  const labelStyle = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary, #475569)',
    marginBottom: '5px',
    display: 'block',
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        borderRadius: '20px',
        border: '1px solid var(--border-light, #e2e8f0)',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.2)',
        width: '100%',
        maxWidth: '440px',
        overflow: 'hidden',
        position: 'relative',
        animation: 'modalSlideUp 0.25s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-light, #f1f5f9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card-subtle, #f8fafc)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#fee2e2',
              color: '#b91c1c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <KeyRound size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                Change Password
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>
                Verified via your official Thapar email
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--border-light, #e2e8f0)';
              e.currentTarget.style.color = 'var(--text-primary, #0f172a)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'var(--text-muted, #94a3b8)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          {/* User Email Pill */}
          <div style={{
            padding: '10px 14px',
            background: 'var(--bg-card-subtle, #f8fafc)',
            border: '1px solid var(--border-light, #e2e8f0)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={15} color="#b91c1c" />
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
                {user?.email || 'Logged In Account'}
              </span>
            </div>
            <span style={{
              fontSize: '10.5px',
              fontWeight: 700,
              background: '#dcfce7',
              color: '#15803d',
              padding: '2px 8px',
              borderRadius: '99px',
            }}>
              Verified
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '10px',
              color: '#991b1b',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '18px',
              lineHeight: 1.4,
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Send Verification Code */}
          {step === 1 && (
            <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
              <p style={{
                fontSize: '13px',
                color: 'var(--text-secondary, #475569)',
                lineHeight: 1.5,
                margin: '0 0 20px 0',
              }}>
                To ensure account security, click the button below to send a 6-digit confirmation code to your official Thapar email address.
              </p>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="spin-animation" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Send Verification Code
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: Enter Code & Set New Password */}
          {step === 2 && (
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 6-Digit Code */}
              <div>
                <label style={labelStyle}>6-Digit Verification Code</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <KeyRound size={16} />
                  </div>
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
                      fontSize: '16px',
                    }}
                    autoFocus
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={labelStyle}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    style={{ ...inputStyle, paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Lock size={16} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    style={{ ...inputStyle, paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <span style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', display: 'block' }}>
                    Passwords do not match.
                  </span>
                )}
              </div>

              {/* Resend Code */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>
                {resendCooldown > 0 ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> Resend verification code in {resendCooldown}s
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

              {/* Update Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '4px',
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="spin-animation" />
                    Updating Password...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                Password Updated!
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                {successMsg || 'Your account password has been changed successfully.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
