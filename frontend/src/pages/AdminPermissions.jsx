import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { ShieldCheck, User as UserIcon, Save, Plus } from "lucide-react";

const MODULE_GROUPS = [
  {
    name: "Main Application Modules",
    paths: [
      { path: "/photo-orders", label: "Photo Orders" },
      { path: "/lab-photo-process", label: "Lab Photo Process" },
      { path: "/bill-payment", label: "Bill Payment" },
      { path: "/money-transfer", label: "Money Transfer" },
      { path: "/service-orders", label: "Service Orders" },
      { path: "/customers", label: "Customers" },
      { path: "/transactions", label: "Transactions" },
      { path: "/uploads", label: "Image Storage" },
      { path: "/logs", label: "System Logs" },
    ]
  },
  {
    name: "Configuration Module",
    paths: [
      { path: "/configuration", label: "Configuration" },
      { path: "/configuration/items", label: "Photo Items" },
      { path: "/configuration/addons", label: "Addons" },
      { path: "/configuration/pricing", label: "Addon Pricing" },
      { path: "/configuration/services", label: "Services" },
      { path: "/configuration/accounts", label: "Accounts" },
      { path: "/configuration/values", label: "Values" },
      { path: "/configuration/audit", label: "Audit Trail" }
    ]
  }
];

const ALL_PATHS = MODULE_GROUPS.flatMap(g => g.paths);

export default function AdminPermissions() {
  const { user, refreshPermissions, setPagePermissions, setPermissions: setAuthPermissions } = useAuth();
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

  const [activeTab, setActiveTab] = useState("access"); // "access" or "data"
  const [activeSubTab, setActiveSubTab] = useState("details"); // "details" or "permissions"
  const [clearingTable, setClearingTable] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [tableToClear, setTableToClear] = useState(null);

  const DATABASE_TABLES = [
    { id: "photo_orders", label: "Photo Orders" },
    { id: "service_orders", label: "Service Orders" },
    { id: "bill_payments", label: "Bill Payments" },
    { id: "money_transfers", label: "Money Transfers" },
    { id: "financial_transactions", label: "Financial Transactions" },
    { id: "uploads", label: "Image Storage (Uploads)" },
    { id: "customers", label: "Customers" },
    { id: "audit_logs", label: "Audit Logs" },
    { id: "lab_process_logs", label: "Lab Process Logs" }
  ];

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
          hasAccess: existing ? existing.hasAccess : false,
          canAdd: existing ? existing.canAdd : false,
          canEdit: existing ? existing.canEdit : false,
          canDelete: existing ? existing.canDelete : false
        };
      });
      setPermissions(mergedPerms);
    } catch (err) {
      setAlert({ type: "error", message: "Failed to load permissions for user." });
    }
  };

  const handleFieldToggle = (path, field) => {
    setPermissions(prev => {
      const newPerms = prev.map(p => 
        p.pagePath === path ? { ...p, [field]: !p[field] } : p
      );
      
      console.log("Local permissions updated for user:", selectedUserId, newPerms);
      console.log("Current logged in user ID:", user?.id);

      // Instant reflection for self
      if (selectedUserId == user?.id) {
        console.log("MATCH! Reflecting permissions for self instantly", user.id);
        setAuthPermissions(newPerms.filter(p => p.hasAccess).map(p => p.pagePath));
        setPagePermissions(newPerms);
      } else {
        console.log("NO MATCH. selectedUserId:", typeof selectedUserId, selectedUserId, "user.id:", typeof user?.id, user?.id);
      }

      return newPerms;
    });
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
      
      // If we are editing our own permissions, refresh them instantly
      if (selectedUserId === user?.id) {
        await refreshPermissions();
      }
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

  const initiateClearTable = (tableId) => {
    setTableToClear(tableId);
    setShowPasswordModal(true);
  };

  const handleClearTableConfirm = async () => {
    if (!adminPassword) {
      setAlert({ type: "error", message: "Password is required." });
      return;
    }
    
    setClearingTable(tableToClear);
    setShowPasswordModal(false);
    
    try {
      await api.post(`/admin/database/clear/${tableToClear}`, { password: adminPassword });
      setAlert({ type: "success", message: `Successfully cleared all data from '${tableToClear}'.` });
    } catch (err) {
      setAlert({ type: "error", message: err.message || `Failed to clear table '${tableToClear}'.` });
    } finally {
      setClearingTable(null);
      setTableToClear(null);
      setAdminPassword("");
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
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-slate-400 mt-2">System administration and data controls.</p>
        </div>

        <div className="flex p-1 bg-slate-800/50 backdrop-blur-md rounded-xl border border-slate-700/50">
          <button
            onClick={() => setActiveTab("access")}
            className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${activeTab === "access" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"}`}
          >
            Access Management
          </button>
          <button
            onClick={() => setActiveTab("data")}
            className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${activeTab === "data" 
              ? "bg-red-600 text-white shadow-lg shadow-red-900/20" 
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"}`}
          >
            Data Management
          </button>
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

      {activeTab === "access" ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
              {/* Sub-tabs Switcher */}
              <div className="flex border-b border-slate-700 mb-6">
                <button
                  onClick={() => setActiveSubTab("details")}
                  className={`px-6 py-3 text-sm font-semibold transition-all relative ${
                    activeSubTab === "details" 
                      ? "text-primary" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Account & Security
                  {activeSubTab === "details" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>}
                </button>
                <button
                  onClick={() => setActiveSubTab("permissions")}
                  className={`px-6 py-3 text-sm font-semibold transition-all relative ${
                    activeSubTab === "permissions" 
                      ? "text-primary" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Page Permissions
                  {activeSubTab === "permissions" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>}
                </button>
              </div>

              {activeSubTab === "details" ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
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
              ) : (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
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
                    <CardContent className="space-y-8">
                      {MODULE_GROUPS.map(group => (
                        <div key={group.name} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-slate-800"></div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{group.name}</h3>
                            <div className="h-px flex-1 bg-slate-800"></div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.paths.map(pathObj => {
                              const isMainConfiguration = pathObj.path === '/configuration';
                              const isConfigurationSubmodule = pathObj.path.startsWith('/configuration/') && pathObj.path !== '/configuration';

                              // Skip submodules here, they will be rendered inside the Main Configuration card
                              if (isConfigurationSubmodule) return null;

                              const perm = permissions.find(p => p.pagePath === pathObj.path) || { hasAccess: false, canAdd: false, canEdit: false, canDelete: false };
                              
                              return (
                                <div key={pathObj.path} className={`p-4 rounded-xl bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 transition-colors flex flex-col justify-between space-y-4 ${isMainConfiguration ? 'md:col-span-2 lg:col-span-3' : ''}`}>
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className={`font-bold ${isMainConfiguration ? 'text-lg text-primary' : 'text-slate-200'}`}>{pathObj.label}</div>
                                      <div className="text-[10px] text-slate-500 font-mono mt-1">{pathObj.path}</div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Access</span>
                                      <Switch
                                        checked={perm.hasAccess}
                                        onCheckedChange={() => handleFieldToggle(pathObj.path, 'hasAccess')}
                                      />
                                    </div>
                                  </div>
                                  
                                  {isMainConfiguration && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                                      {group.paths.filter(p => p.path.startsWith('/configuration/') && p.path !== '/configuration').map(subPath => {
                                        const subPerm = permissions.find(p => p.pagePath === subPath.path) || { hasAccess: false, canAdd: false, canEdit: false, canDelete: false };
                                        const isAuditTrail = subPath.path === '/configuration/audit';
                                        const showGranular = !isAuditTrail;

                                        return (
                                          <div key={subPath.path} className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30 space-y-3">
                                            <div className="flex items-center justify-between">
                                              <div className="text-sm font-medium text-slate-300">{subPath.label}</div>
                                              <Switch
                                                checked={subPerm.hasAccess}
                                                disabled={!perm.hasAccess}
                                                onCheckedChange={() => handleFieldToggle(subPath.path, 'hasAccess')}
                                              />
                                            </div>
                                            
                                            {showGranular && (
                                              <div className={`grid grid-cols-3 gap-1 pt-2 border-t border-slate-700/50 transition-all ${subPerm.hasAccess && perm.hasAccess ? 'opacity-100' : 'opacity-30 pointer-events-none grayscale'}`}>
                                                <div className="flex flex-col items-center">
                                                  <span className="text-[8px] text-slate-500 uppercase font-bold">Add</span>
                                                  <Switch
                                                    checked={subPerm.canAdd}
                                                    onCheckedChange={() => handleFieldToggle(subPath.path, 'canAdd')}
                                                  />
                                                </div>
                                                <div className="flex flex-col items-center">
                                                  <span className="text-[8px] text-slate-500 uppercase font-bold">Edit</span>
                                                  <Switch
                                                    checked={subPerm.canEdit}
                                                    onCheckedChange={() => handleFieldToggle(subPath.path, 'canEdit')}
                                                  />
                                                </div>
                                                <div className="flex flex-col items-center">
                                                  <span className="text-[8px] text-slate-500 uppercase font-bold">Del</span>
                                                  <Switch
                                                    checked={subPerm.canDelete}
                                                    onCheckedChange={() => handleFieldToggle(subPath.path, 'canDelete')}
                                                  />
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="bg-slate-800/50 border-slate-700 shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-900/50 border-b border-slate-700 pb-4">
              <CardTitle className="flex items-center gap-2 text-red-400">
                Data Management (Danger Zone)
              </CardTitle>
              <CardDescription>
                Manually clear all records from specific database tables. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DATABASE_TABLES.map(table => (
                  <div key={table.id} className="bg-slate-900/50 rounded-xl p-4 border border-red-900/30 flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-200">{table.label}</h4>
                      <p className="text-xs text-slate-500 mt-1">Clear all {table.label.toLowerCase()}</p>
                    </div>
                    <Button 
                      variant="destructive"
                      size="sm"
                      disabled={clearingTable !== null}
                      onClick={() => initiateClearTable(table.id)}
                      className="bg-red-900/80 hover:bg-red-600 text-white shadow-md shadow-red-900/20"
                    >
                      {clearingTable === table.id ? "Clearing..." : "Clear"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      
      {/* Password Verification Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-red-900/50 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-red-500 mb-2">Security Verification</h3>
            <p className="text-slate-400 text-sm mb-6">
              You are about to delete ALL data in the <strong className="text-white">{tableToClear}</strong> table. 
              This action is permanent. Please enter your admin password to confirm.
            </p>
            
            <div className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Enter your password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleClearTableConfirm()}
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 border-slate-700 hover:bg-slate-800 text-slate-300"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setAdminPassword("");
                    setTableToClear(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20"
                  onClick={handleClearTableConfirm}
                  disabled={!adminPassword}
                >
                  Confirm Deletion
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
