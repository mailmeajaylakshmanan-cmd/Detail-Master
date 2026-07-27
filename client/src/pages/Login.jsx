import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { User, Lock, Eye, EyeOff, ArrowRight, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import brandLogo from '../assets/brand_logo.png';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('Welcome back!');
      navigate('/');
    } catch {
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 lg:p-8">
      
      {/* Container matching Master UI 'card' style but scaled up */}
      <div className="w-full max-w-[1050px] min-h-[620px] flex flex-col md:flex-row overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-3xl bg-white/60 backdrop-blur-xl border border-white/60">
        
        {/* Left Panel - Brand (Light frosted glass with car pattern) */}
        <div className="hidden md:flex md:w-[45%] bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-12 flex-col justify-between relative overflow-hidden border-r border-white/50">
          
          {/* Car Wireframe Pattern matching MasterCustomer */}
          <div 
            className="absolute inset-0 opacity-[0.03] mix-blend-multiply bg-center bg-no-repeat bg-cover pointer-events-none"
            style={{ backgroundImage: 'url("/car_wireframe.png")', backgroundPosition: 'center 60%' }}
          />

          {/* Subtle light background decorations */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-400/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4"></div>
          
          <div className="relative z-10 flex flex-col items-center mt-12 text-center">
            {/* Logo Container */}
            <div className="w-48 h-48 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-[28px] border border-gray-100 p-6 mb-8 flex items-center justify-center transition-transform hover:scale-105 duration-300">
              <img src={brandLogo} alt="Logo" className="w-full h-full object-contain filter drop-shadow-sm rounded-[16px]" />
            </div>
            <h1 className="text-[26px] font-black tracking-tight text-slate-800 mb-1.5">
              DETAILING MASTERS
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-600">
              Auto Detailing
            </p>
          </div>

          <div className="relative z-10 mb-12 text-center px-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 mb-5 text-orange-500">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-[15px] font-medium text-slate-600 italic leading-relaxed mb-6 tracking-wide">
              "Every car is a masterpiece,<br/>but yours should be flawless."
            </p>
            <div className="w-12 h-[3px] bg-gradient-to-r from-orange-500 to-amber-400 mx-auto rounded-full"></div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full md:w-[55%] p-8 md:p-14 lg:p-16 flex flex-col justify-center bg-white/40">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="md:hidden flex flex-col items-center text-center mb-10">
            <div className="w-32 h-32 bg-white shadow-md rounded-[24px] p-4 mb-5 flex items-center justify-center border border-white">
              <img src={brandLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-[24px] font-black tracking-tight text-gray-900 mb-1">DETAILING MASTERS</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600">Auto Detailing</p>
          </div>

          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 text-[10px] font-bold uppercase tracking-[0.15em] mb-5 border border-orange-100 shadow-sm">
              <ShieldCheck size={14} /> Secure Access
            </div>
            <h2 className="text-[30px] font-black text-slate-900 tracking-tight mb-2">Sign in to portal</h2>
            <p className="text-[14px] font-medium text-slate-500">Manage your premium detailing business</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                <User size={14} className="text-slate-400" /> Username
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="text"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="Enter your username"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Lock size={14} className="text-slate-400" /> Password
                </label>
                <a href="#" className="text-[10px] font-bold text-orange-500 hover:text-orange-600 transition-colors uppercase tracking-widest">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] pr-12"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center pt-2 pb-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="w-[18px] h-[18px] rounded-[4px] border-[2px] border-slate-300 bg-white peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all shadow-sm"></div>
                  <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[13px] font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Keep me signed in</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 text-[14px] font-bold tracking-wide text-white rounded-xl flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-orange-500 transition-all duration-300 hover:-translate-y-0.5 shadow-[0_8px_20px_-4px_rgba(249,115,22,0.4)] hover:shadow-[0_12px_24px_-6px_rgba(249,115,22,0.5)] border border-orange-500/30"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Authenticating...</>
              ) : (
                <>Sign In Securely <ArrowRight size={18} /></>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}