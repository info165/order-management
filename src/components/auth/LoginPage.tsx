import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Building2,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { generatePasswordResetOtp, verifyOtpAndResetPassword } from '../../services/dataService';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login, signInWithGoogle, availablePersonas } = useAuth();

  // Mode: 'login' | 'reset-otp'
  const [activeTab, setActiveTab] = useState<'login' | 'reset-otp'>('login');

  // Login form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [showQuickLogins, setShowQuickLogins] = useState(false);

  // OTP Reset states
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtpCode, setGeneratedOtpCode] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Handle standard login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your issued email/ID and password.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(identifier, password);
      setSuccessNotice('Authentication successful. Redirecting...');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth
  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      setSuccessNotice('Signed in with Google OAuth successfully.');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Google OAuth sign-in failed. Please try again or use your password.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Handle Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Please enter your account email address.');
      return;
    }

    setResetError(null);
    setOtpLoading(true);
    try {
      const res = await generatePasswordResetOtp(resetEmail);
      setOtpSent(true);
      setGeneratedOtpCode(res.otp);
      setOtpExpiresAt(res.expiresAt);
      setResetOtp(res.otp); // Pre-fill for ease of use
    } catch (err: any) {
      setResetError(err.message || 'Failed to generate OTP. Please verify the email.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle Step 2: Verify OTP & Reset Password
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetOtp.trim() || !newPassword.trim()) {
      setResetError('Please fill in all fields (Email, OTP code, and New Password).');
      return;
    }

    if (newPassword.length < 4) {
      setResetError('New password must be at least 4 characters long.');
      return;
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetError(null);
    setOtpLoading(true);
    try {
      await verifyOtpAndResetPassword(resetEmail, resetOtp, newPassword);
      setSuccessNotice('Password successfully reset! You can now sign in with your new credentials.');
      setIdentifier(resetEmail);
      setPassword(newPassword);
      setActiveTab('login');
      // Reset OTP states
      setOtpSent(false);
      setGeneratedOtpCode(null);
      setResetOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setResetError(err.message || 'Failed to verify OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const copyOtpToClipboard = () => {
    if (!generatedOtpCode) return;
    navigator.clipboard.writeText(generatedOtpCode);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  // Quick fill helper
  const handleQuickFill = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Top minimal header */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 px-6 py-4 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-bold text-slate-950 shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-white tracking-tight block">
                GovSchool Order ERP
              </span>
              <span className="text-[11px] text-amber-400 font-medium">
                Institutional Supply & Partner Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-[11px] text-slate-300 font-medium">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Restricted Access</span>
            </span>
          </div>
        </div>
      </header>

      {/* Centered Main Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-slate-950 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60 space-y-6">
          
          {/* Card Header & Tabs */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Super Admin Authorized</span>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setError(null);
                    setSuccessNotice(null);
                  }}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    activeTab === 'login'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reset-otp');
                    setResetError(null);
                    setSuccessNotice(null);
                  }}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    activeTab === 'reset-otp'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Reset via OTP
                </button>
              </div>
            </div>

            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {activeTab === 'login' ? 'Welcome Back' : 'Reset Password via OTP'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === 'login'
                ? 'Sign in using your Google account or issued credentials.'
                : 'Generate a 6-digit OTP code to verify your account and set a new password.'}
            </p>
          </div>

          {/* Feedback Notices */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resetError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{resetError}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* ==================== TAB 1: SIGN IN ==================== */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-100 font-semibold text-xs flex items-center justify-center gap-2.5 shadow-sm transition-all disabled:opacity-60 cursor-pointer group"
              >
                {/* Clean Google G SVG */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google Account'}</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-950 px-3 text-[10px] uppercase font-semibold tracking-wider text-slate-500">
                  or sign in with password
                </span>
                <div className="border-t border-slate-800 w-full" />
              </div>

              {/* Credentials Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">
                    Email / Partner Code / Username
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. info@funscholar.com or dataentry"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-300 font-semibold">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('reset-otp');
                        setResetEmail(identifier);
                        setResetError(null);
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Forgot? Reset via OTP
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all disabled:opacity-50 cursor-pointer mt-1"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <>
                      <span>Sign In to Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Evaluation Accounts Accordion */}
              <div className="pt-2 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setShowQuickLogins(!showQuickLogins)}
                  className="w-full text-left py-1 text-[11px] text-slate-500 hover:text-slate-300 flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Evaluation demo accounts</span>
                  </span>
                  <span className="text-[10px] text-slate-600">{showQuickLogins ? 'Hide ▲' : 'Show 1-Click Fill ▼'}</span>
                </button>

                {showQuickLogins && (
                  <div className="grid grid-cols-1 gap-1.5 mt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleQuickFill('info@funscholar.com', 'admin@funscholar')}
                      className="text-left px-3 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-200 text-xs">Super Admin (All Views)</div>
                        <div className="text-[10px] text-slate-500 font-mono">info@funscholar.com</div>
                      </div>
                      <span className="text-[10px] text-purple-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                        Fill →
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickFill('dataentry@funscholar.com', 'entry@2026')}
                      className="text-left px-3 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-200 text-xs">Data Entry Operator (Dedicated View)</div>
                        <div className="text-[10px] text-slate-500 font-mono">dataentry@funscholar.com</div>
                      </div>
                      <span className="text-[10px] text-sky-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                        Fill →
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickFill('satish.pandey@agents.govschool.in', 'agent@2026')}
                      className="text-left px-3 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-200 text-xs">Regional Field Partner (Partner View)</div>
                        <div className="text-[10px] text-slate-500 font-mono">satish.pandey@agents.govschool.in</div>
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                        Fill →
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: RESET VIA OTP ==================== */}
          {activeTab === 'reset-otp' && (
            <div className="space-y-4 text-xs">
              {!otpSent ? (
                /* STEP 1: Enter email to request OTP */
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">
                      Account Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="e.g. dataentry@funscholar.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      We will generate a 6-digit verification code (OTP) for your registered account.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {otpLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Generate Verification OTP</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                /* STEP 2: Enter OTP & New Password */
                <form onSubmit={handleVerifyAndReset} className="space-y-4">
                  {/* Display Generated OTP Banner */}
                  {generatedOtpCode && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-400">
                        Generated OTP Code
                      </span>
                      <div className="text-2xl font-extrabold font-mono tracking-widest text-white">
                        {generatedOtpCode}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={copyOtpToClipboard}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold rounded-md flex items-center gap-1 transition-colors"
                        >
                          {copiedOtp ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedOtp ? 'Copied' : 'Copy Code'}</span>
                        </button>
                        <span className="text-[10px] text-slate-400">
                          Valid for 10 minutes (Master bypass: 123456)
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">
                      6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.trim())}
                      placeholder="Enter 6-digit code"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono text-center tracking-widest text-base font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 4 characters"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">
                      Confirm New Password
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-semibold transition-colors"
                    >
                      Resend
                    </button>
                    <button
                      type="submit"
                      disabled={otpLoading}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {otpLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Verify OTP & Update Password</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      Cancel and return to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Footer note */}
          <div className="pt-2 border-t border-slate-900 text-center">
            <span className="text-[11px] text-slate-500">
              Need authorized credentials? Contact Super Admin at{' '}
              <span className="text-amber-400 font-mono">info@funscholar.com</span>
            </span>
          </div>

        </div>
      </main>

      {/* Security Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950/80 px-4 py-3 text-center text-xs text-slate-500">
        GovSchool Institutional Order ERP • Super Admin Authority Governance
      </footer>
    </div>
  );
};
