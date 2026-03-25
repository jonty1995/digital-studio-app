import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid or missing reset token.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setStatus('error');
            setMessage('Password must be at least 6 characters.');
            return;
        }

        setStatus('loading');
        try {
            const response = await api.post('/auth/reset-password', {
                token,
                newPassword: password
            });
            setStatus('success');
            setMessage(response.message || 'Password reset successfully!');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setStatus('error');
            setMessage(err.message || 'Failed to reset password. The link may be expired.');
        }
    };

    if (!token && status === 'error') {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#1e293b] rounded-2xl shadow-2xl p-8 border border-red-500/20 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Invalid Reset Link</h2>
                    <p className="text-slate-400 mb-6">{message}</p>
                    <Link to="/login" className="text-blue-400 hover:underline flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#1e293b] rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50 p-8">
                <div className="mb-8 flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-blue-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
                    <p className="text-slate-400 text-center">
                        Please enter your new password below.
                    </p>
                </div>

                {status === 'success' ? (
                    <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <p className="text-green-400 font-medium mb-4">{message}</p>
                        <p className="text-slate-400 text-sm">Redirecting to login in 3 seconds...</p>
                        <Link 
                            to="/login"
                            className="inline-block mt-6 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            Log in now
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-11 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        placeholder="Min 6 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-11 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        placeholder="Repeat new password"
                                    />
                                </div>
                            </div>
                        </div>

                        {status === 'error' && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                <p className="text-red-400 text-sm text-center font-medium">{message}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center text-lg active:scale-[0.98]"
                        >
                            {status === 'loading' ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                    Resetting Password...
                                </>
                            ) : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
