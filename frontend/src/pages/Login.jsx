import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Camera } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const success = await login(username, password);
    if (success) {
      const from = location.state?.from?.pathname || "/photo-orders";
      navigate(from, { replace: true });
    } else {
      setError("Invalid username or password");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 overflow-hidden relative">
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-800/80 backdrop-blur-xl z-10 mx-4">
        <CardHeader className="text-center pb-8 border-b border-slate-700/50">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary/20 border border-primary/30">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Digital Studio
          </CardTitle>
          <p className="text-sm text-slate-400 mt-2 font-medium tracking-wide">Enter your credentials to continue</p>
        </CardHeader>
        <CardContent className="pt-8 px-8 pb-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="username" className="text-slate-300 font-semibold tracking-wide text-xs uppercase">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500 focus:border-primary focus:ring-primary/30 h-12 transition-all duration-300"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="password" className="text-slate-300 font-semibold tracking-wide text-xs uppercase">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500 focus:border-primary focus:ring-primary/30 h-12 transition-all duration-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex justify-end">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:text-blue-400 font-medium transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-lg shadow-primary/25 border-0 rounded-xl font-semibold text-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-70 disabled:hover:scale-100"
              disabled={loading || !username || !password}
            >
              {loading ? "Authenticating..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
