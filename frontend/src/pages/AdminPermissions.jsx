import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { ShieldCheck, User as UserIcon, Save, Plus } from "lucide-react";

const ALL_PATHS = [
  { path: "/photo-orders", label: "Photo Orders" },
  { path: "/lab-photo-process", label: "Lab Photo Process" },
  { path: "/bill-payment", label: "Bill Payment" },
  { path: "/money-transfer", label: "Money Transfer" },
  { path: "/service-orders", label: "Service Orders" },
  { path: "/customers", label: "Customers" },
  { path: "/transactions", label: "Transactions" },
  { path: "/uploads", label: "Image Storage" },
  { path: "/logs", label: "System Logs" },
  { path: "/configuration", label: "Configuration" }
];

export default function AdminPermissions() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  // Password reset state
  const [resettingUserId, setResettingUserId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Create user state
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("USER");

  // Edit user state
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("USER");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.get("/admin/users");
      setUsers(data);
    } catch (err) {
      setAlert({ type: "error", message: "Failed to load users." });
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async (userId) => {
    setSelectedUserId(userId);
    setIsCreatingUser(false);
    const selectedUser = users.find(u => u.id === userId);
    if (selectedUser) {
      setEditUsername(selectedUser.username || "");
      setEditEmail(selectedUser.email || "");
      setEditRole(selectedUser.role || "USER");
    }

    try {
      const data = await api.get(`/admin/users/${userId}/permissions`);
      const mergedPerms = ALL_PATHS.map(p => {
        const existing = data.find(d => d.pagePath === p.path);
        return {
          userId: userId,
          pagePath: p.path,
          hasAccess: existing ? existing.hasAccess : false
        };
      });
      setPermissions(mergedPerms);
    } catch (err) {
      setAlert({ type: "error", message: "Failed to load permissions for user." });
    }
  };

  const handleToggle = (path) => {
    setPermissions(prev => prev.map(p => 
      p.pagePath === path ? { ...p, hasAccess: !p.hasAccess } : p
    ));
  };

  const handleUpdateUserDetails = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      await api.put(`/admin/users/${selectedUserId}`, {
        username: editUsername,
        email: editEmail,
        role: editRole
      });
      setAlert({ type: "success", message: "User details updated successfully!" });
      fetchUsers(); // Refresh list to show updated names/roles
    } catch (err) {
      setAlert({ type: "error", message: "Failed to update user details." });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      await api.put(`/admin/users/${selectedUserId}/permissions`, permissions);
      setAlert({ type: "success", message: "Permissions saved successfully!" });
    } catch (err) {
      setAlert({ type: "error", message: "Failed to save permissions." });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!newPassword || newPassword.length < 5) {
      setAlert({ type: "error", message: "Password must be at least 5 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setAlert({ type: "error", message: "Passwords do not match." });
      return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/users/${userId}/password`, { newPassword });
      setAlert({ type: "success", message: "Password reset successfully!" });
      setResettingUserId(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setAlert({ type: "error", message: "Failed to reset password." });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername || !newUserPassword || !newUserEmail) {
      setAlert({ type: "error", message: "Username, Email, and password are required." });
      return;
    }
    if (newUserPassword.length < 5) {
      setAlert({ type: "error", message: "Password must be at least 5 characters." });
      return;
    }
    if (newUserPassword !== newUserConfirmPassword) {
      setAlert({ type: "error", message: "Passwords do not match." });
      return;
    }
    
    setSaving(true);
    try {
      await api.post("/admin/users", { 
        username: newUsername, 
        email: newUserEmail,
        password: newUserPassword, 
        role: newUserRole 
      });
      setAlert({ type: "success", message: `User '${newUsername}' created successfully!` });
      setIsCreatingUser(false);
      setNewUsername("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserConfirmPassword("");
      setNewUserRole("USER");
      fetchUsers();
    } catch (err) {
      setAlert({ type: "error", message: err.message || "Failed to create user." });
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== "ADMIN") {
    return <div className="p-8 text-center text-red-500 font-bold">Access Denied. Admins Only.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Access Management
          </h1>
          <p className="text-slate-400 mt-2">Manage page-level access permissions for all users.</p>
        </div>
      </div>

      {alert && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 transition-opacity ${
          alert.type === "success" 
            ? "bg-green-500/10 border-green-500/20 text-green-400" 
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {alert.type === "success" ? <ShieldCheck className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          <div>{alert.message}</div>
          <button onClick={() => setAlert(null)} className="ml-auto opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* User Selection List */}
        <Card className="col-span-1 bg-slate-800/50 border-slate-700 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">Users</CardTitle>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 bg-slate-800 text-blue-400 border-blue-900/50 hover:bg-blue-900/20 hover:text-blue-300"
              onClick={() => { setSelectedUserId(null); setIsCreatingUser(true); }}
            >
              <Plus className="w-4 h-4 mr-1" /> Add User
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 flex-grow">
            {loading ? <p className="text-slate-400">Loading...</p> : (
              users.map(u => (
                <button
                  key={u.id}
                  onClick={() => loadUserPermissions(u.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${selectedUserId === u.id ? 'bg-primary/20 text-primary border border-primary/30' : 'hover:bg-slate-700/50 text-slate-300'}`}
                >
                  <UserIcon className="w-5 h-5" />
                  <div>
                    <div className="font-semibold">{u.username}</div>
                    <div className="text-xs text-slate-500">{u.role}</div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Side Panel */}
        {isCreatingUser ? (
          <div className="col-span-1 md:col-span-3 space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg">Create New User</CardTitle>
                <CardDescription>Add a new user and specify their authentication role.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Username</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Password</label>
                  <input 
                    type="password" 
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={newUserPassword}
                    onChange={e => setNewUserPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Confirm Password</label>
                  <input 
                    type="password" 
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={newUserConfirmPassword}
                    onChange={e => setNewUserConfirmPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2 pb-4">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Role</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none"
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value)}
                  >
                    <option value="USER">User (Standard)</option>
                    <option value="ADMIN">Admin (Full Access)</option>
                  </select>
                </div>
                <Button 
                  onClick={handleCreateUser} 
                  disabled={saving || !newUsername || !newUserEmail || newUserPassword.length < 5 || newUserPassword !== newUserConfirmPassword}
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                >
                  {saving ? "Creating..." : "Create User"}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : !selectedUserId ? (
          <div className="col-span-1 md:col-span-3 flex items-center justify-center p-12 border border-slate-700/50 rounded-xl bg-slate-800/30 text-slate-500">
            Select a user from the left to view and edit their permissions, or add a new user.
          </div>
        ) : (
          <div className="col-span-1 md:col-span-3 space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">User Details</CardTitle>
                  <CardDescription>Update the basic identity and role for this user.</CardDescription>
                </div>
                <Button onClick={handleUpdateUserDetails} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Update Details"}
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Username</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Email ID</label>
                  <input 
                    type="email" 
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Role</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none"
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                  >
                    <option value="USER">User (Standard)</option>
                    <option value="ADMIN">Admin (Full Access)</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Page Permissions</CardTitle>
                  <CardDescription>Grant or revoke access to specific modules for this user.</CardDescription>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Permissions"}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ALL_PATHS.map(pathObj => {
                    const perm = permissions.find(p => p.pagePath === pathObj.path) || { hasAccess: false };
                    return (
                      <div key={pathObj.path} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 transition-colors">
                        <div>
                          <div className="font-medium text-slate-200">{pathObj.label}</div>
                          <div className="text-xs text-slate-500 font-mono mt-1">{pathObj.path}</div>
                        </div>
                        <Switch
                          checked={perm.hasAccess}
                          onCheckedChange={() => handleToggle(pathObj.path)}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 border-t-red-500/30">
              <CardHeader>
                <CardTitle className="text-lg text-red-400">Security Actions</CardTitle>
                <CardDescription>Administrative security controls for this user.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-200">Force Password Reset</h4>
                    <p className="text-xs text-slate-500 mt-1">Directly overwrite this user's password.</p>
                  </div>
                  
                  {resettingUserId === selectedUserId ? (
                    <div className="flex gap-2 items-center flex-wrap w-full sm:w-auto p-4 bg-slate-950/50 rounded-lg border border-red-900/30">
                      <div className="flex flex-col gap-2">
                        <input 
                          type="password"
                          placeholder="New Password"
                          className="bg-slate-800 border-slate-600 text-white px-3 py-2 rounded-md focus:border-red-500 focus:ring-1 focus:ring-red-500 w-full sm:w-48 text-sm outline-none"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                        />
                        <input 
                          type="password"
                          placeholder="Confirm Password"
                          className="bg-slate-800 border-slate-600 text-white px-3 py-2 rounded-md focus:border-red-500 focus:ring-1 focus:ring-red-500 w-full sm:w-48 text-sm outline-none"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-2 h-full justify-between">
                        <Button 
                          onClick={() => handleResetPassword(selectedUserId)} 
                          disabled={saving || newPassword.length < 5 || newPassword !== confirmPassword} 
                          className="bg-red-600 hover:bg-red-700 shadow-md shadow-red-900/20 px-6 py-2 h-auto"
                        >
                          {saving ? "..." : "Confirm"}
                        </Button>
                        <Button variant="ghost" className="text-slate-400 hover:text-white px-2 py-1 h-auto text-xs" onClick={() => { setResettingUserId(null); setNewPassword(""); setConfirmPassword(""); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => setResettingUserId(selectedUserId)}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
                    >
                      Reset Password
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
