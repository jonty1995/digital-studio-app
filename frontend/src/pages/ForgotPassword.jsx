import React, { useState } from 'react';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        try {
            const response = await api.post('/auth/forgot-password', { email });
            setStatus('success');
            setMessage(response.message || 'If an account exists with this email, a reset link has been sent.');
        } catch (err) {
            setStatus('error');
            setMessage(err.message || 'Something went wrong. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#1e293b] rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50 p-8">
                <div className="mb-8 flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                        <Mail className="w-8 h-8 text-blue-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Forgot Password</h2>
                    <p className="text-slate-400 text-center">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                {status === 'success' ? (
                    <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <p className="text-green-400 font-medium mb-6">{message}</p>
                        <Link 
                            to="/login"
                            className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Return to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-lg"
                                    placeholder="your@email.com"
                                />
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
                                    Sending Link...
                                </>
                            ) : 'Send Reset Link'}
                        </button>

                        <div className="text-center pt-2">
                            <Link 
                                to="/login"
                                className="inline-flex items-center text-slate-400 hover:text-white transition-colors text-sm"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
