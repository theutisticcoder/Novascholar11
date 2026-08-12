import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  Sparkles, 
  GraduationCap, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle, 
  AlertCircle 
} from "lucide-react";
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from "../firebase";

interface AuthViewProps {
  onAuthSuccess: (user: any) => void;
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    
    // Basic validations
    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (!isLogin && !username.trim()) {
      setError("Please choose a study handle or display name.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Sign in flow
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg(`Welcome back, ${userCredential.user.displayName || "Scholar"}!`);
        setTimeout(() => {
          onAuthSuccess(userCredential.user);
        }, 1200);
      } else {
        // Sign up flow
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update user profile with Display Name/Username
        await updateProfile(userCredential.user, {
          displayName: username.trim()
        });

        setSuccessMsg("Account created successfully! Preparing your academic workspace...");
        setTimeout(() => {
          onAuthSuccess(userCredential.user);
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      let message = "An error occurred. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        message = "This email address is already registered.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (err.code === "auth/weak-password") {
        message = "Password is too weak. Please use a stronger password.";
      } else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        message = "Invalid email or password combination.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bento-bg flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Decorative dynamic ambient glow */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-bento-primary/10 blur-3xl pointer-events-none" />

      {/* Brand logo / Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center gap-2 mb-8 text-center"
      >
        <div className="w-14 h-14 bg-bento-card border border-bento-secondary/20 rounded-2xl flex items-center justify-center shadow-xl shadow-bento-bg/50">
          <GraduationCap className="w-8 h-8 text-bento-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans mt-2">
          NovaScholar <span className="text-bento-primary">Suite</span>
        </h1>
        <p className="text-xs md:text-sm text-bento-text-muted/80 max-w-sm">
          Next-generation academic space with transcription, Cornell formatting, and custom dashboards.
        </p>
      </motion.div>

      {/* Auth Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-md bg-bento-card border border-bento-secondary/20 rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8 z-10"
      >
        {/* Sign In vs Sign Up Tabs */}
        <div className="grid grid-cols-2 bg-bento-bg p-1 rounded-xl border border-bento-secondary/10 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 px-4 rounded-lg text-xs font-bold tracking-wide uppercase transition cursor-pointer ${
              isLogin 
                ? "bg-bento-secondary/30 text-white shadow-inner" 
                : "text-bento-text-muted hover:text-white"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 px-4 rounded-lg text-xs font-bold tracking-wide uppercase transition cursor-pointer ${
              !isLogin 
                ? "bg-bento-secondary/30 text-white shadow-inner" 
                : "text-bento-text-muted hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Status Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-rose-950/50 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-xs text-rose-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300"
            >
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Study Name / Handle (Sign Up Only) */}
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-bold text-bento-text-muted uppercase tracking-wider mb-1.5">
                Academic Display Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-bento-text-muted/60">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Scholar Emma"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-bento-bg border border-bento-secondary/20 hover:border-bento-secondary/40 focus:border-bento-primary rounded-xl text-white text-xs placeholder-bento-text-muted/40 outline-none transition"
                  required={!isLogin}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-[10px] font-bold text-bento-text-muted uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-bento-text-muted/60">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                placeholder="your.email@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 bg-bento-bg border border-bento-secondary/20 hover:border-bento-secondary/40 focus:border-bento-primary rounded-xl text-white text-xs placeholder-bento-text-muted/40 outline-none transition"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] font-bold text-bento-text-muted uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-bento-text-muted/60">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-2.5 bg-bento-bg border border-bento-secondary/20 hover:border-bento-secondary/40 focus:border-bento-primary rounded-xl text-white text-xs placeholder-bento-text-muted/40 outline-none transition"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-bento-text-muted/60 hover:text-white cursor-pointer"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 mt-2 py-3 px-4 bg-bento-primary hover:bg-opacity-90 text-bento-bg font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-bento-primary/10 transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>{isLogin ? "Unlock Workspace" : "Register Academic Key"}</span>
                <ArrowRight className="w-4 h-4 text-bento-bg" />
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Decorative subtle footnotes */}
      <span className="text-[10px] text-bento-text-muted/40 mt-6 tracking-wide">
        Secure academic cloud powered by Google Firebase Auth & Firestore.
      </span>
    </div>
  );
}
