import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { ShieldCheck, User as UserIcon, Save, Plus, Trash2, Activity, Thermometer, HardDrive, Database, RefreshCw } from "lucide-react";

const MODULE_GROUPS = [
  {
    name: "Main Application Modules",
    paths: [
      { path: "/photo-orders", label: "Photo Orders" },
      { path: "/lab-photo-process", label: "Lab Photo Process" },
      { path: "/bill-payment", label: "Bill Payment" },
      { path: "/money-transfer", label: "Money Transfer" },
      { path: "/service-orders", label: "Service Orders" },
      { path: "/travel/train", label: "Train Bookings" },
      { path: "/customers", label: "Customers" },
      { path: "/transactions", label: "Transactions" },
      { path: "/uploads", label: "Image Storage" },
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

  const [activeTab, setActiveTab] = useState("access"); // "access", "data", or "system"
  const [activeSubTab, setActiveSubTab] = useState("details"); // "details" or "permissions"
  const [clearingTable, setClearingTable] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [tableToClear, setTableToClear] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [refreshingSystem, setRefreshingSystem] = useState(false);

  const DATABASE_TABLES = [
    { id: "photo_orders", label: "Photo Orders" },
    { id: "service_orders", label: "Service Orders" },
    { id: "bill_payments", label: "Bill Payments" },
    { id: "money_transfers", label: "Money Transfers" },
    { id: "train_bookings", label: "Train Bookings" },
    { id: "financial_transactions", label: "Financial Transactions" },
    { id: "uploads", label: "Image Storage (Uploads)" },
    { id: "customers", label: "Customers" },
    { id: "audit_logs", label: "Audit Logs" },
    { id: "lab_process_logs", label: "Lab Process Logs" },
    { id: "photo_items", label: "Photo Items" },
    { id: "addons", label: "Addons" },
    { id: "service_items", label: "Services" },
    { id: "financial_accounts", label: "Accounts" },
    { id: "value_configurations", label: "Configurations (Value)" }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === "system") {
      fetchSystemStatus();
      const interval = setInterval(fetchSystemStatus, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Clear alerts when switching tabs to prevent "message bleed" between sections
  useEffect(() => {
    setAlert(null);
  }, [activeTab]);

  const fetchSystemStatus = async () => {
    setRefreshingSystem(true);
    try {
      const data = await api.get("/admin/system/status");
      setSystemStatus(data);
    } catch (err) {
      console.error("Failed to fetch system status", err);
    } finally {
      setRefreshingSystem(false);
    }
  };

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

  const handleUserSelect = async (userId) => {
    setSelectedUserId(userId);
    setIsCreatingUser(false);
    setLoading(true);
    setResettingUserId(null);
    setAlert(null);
    
    try {
      const userToEdit = users.find(u => u.id === userId);
      if (userToEdit) {
        setEditUsername(userToEdit.username);
        setEditEmail(userToEdit.email || "");
        setEditRole(userToEdit.role);
      }
      
      const userPermissions = await api.get(`/admin/users/${userId}/permissions`);
      
      // Merge with default list to ensure all paths are covered
      const mergedPermissions = ALL_PATHS.map(pathObj => {
        const existing = userPermissions.find(p => p.pagePath === pathObj.path);
        return existing || {
          userId,
          pagePath: pathObj.path,
          hasAccess: false,
          canAdd: false,
          canEdit: false,
          canDelete: false
        };
      });
      
      setPermissions(mergedPermissions);
    } catch (err) {
      setAlert({ type: "error", message: "Failed to load user permissions." });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (path, field) => {
    setPermissions(prev => {
      const newPerms = [...prev];
      const index = newPerms.findIndex(p => p.pagePath === path);
      
      if (index !== -1) {
        newPerms[index] = {
          ...newPerms[index],
          [field]: !newPerms[index][field]
        };
        
        // If we enable any sub-permission, we must enable hasAccess
        if (field !== 'hasAccess' && newPerms[index][field]) {
          newPerms[index].hasAccess = true;
        }
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

  const handleDeleteUser = async () => {
    if (selectedUserId === user?.id) {
      setAlert({ type: "error", message: "You cannot delete your own account while logged in." });
      return;
    }

    if (!window.confirm(`Are you sure you want to PERMANENTLY delete user '${editUsername}'? This action cannot be undone.`)) {
      return;
    }

    setSaving(true);
    try {
      await api.delete(`/admin/users/${selectedUserId}`);
      setAlert({ type: "success", message: `User '${editUsername}' deleted successfully.` });
      setSelectedUserId(null);
      fetchUsers();
    } catch (err) {
      setAlert({ type: "error", message: "Failed to delete user." });
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== "ADMIN") {
    return <div className="p-8 text-center text-red-500 font-bold">Access Denied. Admins Only.</div>;
  }

  return (
    <div className="w-full p-4 sm:p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Access Management</h1>
          </div>
          <p className="text-slate-500 mt-2">Manage page-level access permissions for all users.</p>
        </div>

        <div className="flex p-1 bg-slate-100/80 backdrop-blur-sm rounded-xl w-full sm:w-[480px] border border-slate-200 shadow-inner">
          <button 
            onClick={() => { setActiveTab("access"); setIsCreatingUser(false); }}
            className={`flex-1 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 uppercase tracking-wider ${activeTab === 'access'
                ? "bg-white text-primary shadow-md scale-[1.02]"
                : "text-slate-500 hover:text-primary hover:bg-white/40"
                }`}
          >
            Permissions
          </button>
          <button 
            onClick={() => { setActiveTab("data"); setSelectedUserId(null); setIsCreatingUser(false); }}
            className={`flex-1 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 uppercase tracking-wider ${activeTab === 'data'
                ? "bg-white text-primary shadow-md scale-[1.02]"
                : "text-slate-500 hover:text-primary hover:bg-white/40"
                }`}
          >
            Database
          </button>
          <button 
            onClick={() => { setActiveTab("system"); setSelectedUserId(null); setIsCreatingUser(false); }}
            className={`flex-1 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 uppercase tracking-wider ${activeTab === 'system'
                ? "bg-white text-primary shadow-md scale-[1.02]"
                : "text-slate-500 hover:text-primary hover:bg-white/40"
                }`}
          >
            System
          </button>
        </div>
      </div>

      {alert && (
        <div className={`p-4 rounded-xl border animate-in slide-in-from-top-4 duration-300 ${alert.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/10 border-rose-500/50 text-rose-400'}`}>
          {alert.message}
        </div>
      )}

      {activeTab === "access" ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* User List Panel */}
          <Card className="col-span-1 bg-white border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Users</CardTitle>
              <Button size="sm" variant="ghost" className="h-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => { setIsCreatingUser(true); setSelectedUserId(null); }}>
                <Plus className="w-4 h-4 mr-1" />
                Add User
              </Button>
            </CardHeader>
            <CardContent className="space-y-1 px-2">
              {loading && !users.length ? (
                <div className="text-center py-8 text-slate-500 text-sm">Loading...</div>
              ) : (
                users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleUserSelect(u.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group ${
                      selectedUserId === u.id 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className={`p-2 rounded-full ${selectedUserId === u.id ? 'bg-primary/20' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate text-slate-900">{u.username}</div>
                      <div className="text-xs text-slate-500">{u.role}</div>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Right Side Panel */}
          {isCreatingUser ? (
            <div className="col-span-1 md:col-span-3 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-slate-900">Create New User</CardTitle>
                  <CardDescription className="text-slate-500">Initialize a new account with specific access roles.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 max-w-md">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Username <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      placeholder="Enter unique username"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Address <span className="text-red-500">*</span></label>
                    <input 
                      type="email" 
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={newUserEmail}
                      onChange={e => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password <span className="text-red-500">*</span></label>
                      <input 
                        type="password" 
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        value={newUserPassword}
                        onChange={e => setNewUserPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confirm <span className="text-red-500">*</span></label>
                      <input 
                        type="password" 
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        value={newUserConfirmPassword}
                        onChange={e => setNewUserConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pb-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assign Role</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                      value={newUserRole}
                      onChange={e => setNewUserRole(e.target.value)}
                    >
                      <option value="USER">User (Standard)</option>
                      <option value="ADMIN">Admin (Superuser)</option>
                    </select>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsCreatingUser(false)}
                      className="flex-1 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateUser} 
                      disabled={saving || !newUsername || !newUserEmail || newUserPassword.length < 5 || newUserPassword !== newUserConfirmPassword}
                      className="flex-[2] bg-primary hover:bg-primary/90 text-white"
                    >
                      {saving ? "Creating..." : "Create User"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : !selectedUserId ? (
            <div className="col-span-1 md:col-span-3 flex items-center justify-center p-12 border border-slate-200 border-dashed rounded-xl bg-slate-50 text-slate-400 font-medium">
              Select a user from the left to view and edit their permissions, or add a new user.
            </div>
          ) : (
            <div className="col-span-1 md:col-span-3 space-y-6">
              {/* Sub-tabs Switcher */}
              <div className="flex border-b border-slate-200 mb-6">
                <button
                  onClick={() => { setActiveSubTab("details"); setAlert(null); }}
                  className={`px-6 py-3 text-sm font-semibold transition-all relative ${
                    activeSubTab === "details" 
                      ? "text-primary" 
                      : "text-slate-500 hover:text-primary"
                  }`}
                >
                  Account & Security
                  {activeSubTab === "details" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>}
                </button>
                <button
                  onClick={() => { setActiveSubTab("permissions"); setAlert(null); }}
                  className={`px-6 py-3 text-sm font-semibold transition-all relative ${
                    activeSubTab === "permissions" 
                      ? "text-primary" 
                      : "text-slate-500 hover:text-primary"
                  }`}
                >
                  Page Permissions
                  {activeSubTab === "permissions" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>}
                </button>
              </div>

              {activeSubTab === "details" ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <Card className="bg-white border-slate-200 shadow-sm">
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
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Username</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editUsername}
                          onChange={e => setEditUsername(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Email ID</label>
                        <input 
                          type="email" 
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editEmail}
                          onChange={e => setEditEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Role</label>
                        <select 
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none"
                          value={editRole}
                          onChange={e => setEditRole(e.target.value)}
                        >
                          <option value="USER">User (Standard)</option>
                          <option value="ADMIN">Admin (Full Access)</option>
                        </select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border-slate-200 border-t-red-500/30 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg text-red-400">Security Actions</CardTitle>
                      <CardDescription>Administrative security controls for this user.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div>
                          <h4 className="font-medium text-slate-800">Force Password Reset</h4>
                          <p className="text-xs text-slate-500 mt-1">Directly overwrite this user's password.</p>
                        </div>
                        
                        {resettingUserId === selectedUserId ? (
                          <div className="flex gap-2 items-center flex-wrap w-full sm:w-auto p-4 bg-white rounded-lg border border-red-200">
                            <div className="flex flex-col gap-2">
                              <input 
                                type="password"
                                placeholder="New Password"
                                className="bg-slate-50 border-slate-200 text-slate-900 px-3 py-2 rounded-md focus:border-red-500 focus:ring-1 focus:ring-red-500 w-full sm:w-48 text-sm outline-none"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                              />
                              <input 
                                type="password"
                                placeholder="Confirm Password"
                                className="bg-slate-50 border-slate-200 text-slate-900 px-3 py-2 rounded-md focus:border-red-500 focus:ring-1 focus:ring-red-500 w-full sm:w-48 text-sm outline-none"
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

                      <div className="bg-rose-50 rounded-xl p-4 border border-rose-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mt-4">
                        <div>
                          <h4 className="font-medium text-rose-900">Delete User Account</h4>
                          <p className="text-xs text-rose-600 mt-1">Permanently remove this user and all their permissions.</p>
                        </div>
                        <Button 
                          variant="destructive" 
                          onClick={handleDeleteUser}
                          disabled={saving || selectedUserId === user?.id}
                          className="bg-rose-600 hover:bg-rose-700 text-white border-none"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Account
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <Card className="bg-white border-slate-200 shadow-sm">
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
                            <div className="h-px flex-1 bg-slate-200"></div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{group.name}</h3>
                            <div className="h-px flex-1 bg-slate-200"></div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.paths.map(pathObj => {
                              const isMainConfiguration = pathObj.path === '/configuration';
                              const isConfigurationSubmodule = pathObj.path.startsWith('/configuration/') && pathObj.path !== '/configuration';

                              // Skip submodules here, they will be rendered inside the Main Configuration card
                              if (isConfigurationSubmodule) return null;

                              const perm = permissions.find(p => p.pagePath === pathObj.path) || { hasAccess: false, canAdd: false, canEdit: false, canDelete: false };
                              
                              return (
                                <div key={pathObj.path} className={`p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between space-y-4 ${isMainConfiguration ? 'md:col-span-2 lg:col-span-3' : ''}`}>
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className={`font-bold ${isMainConfiguration ? 'text-lg text-primary' : 'text-slate-800'}`}>{pathObj.label}</div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-1">{pathObj.path}</div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Access</span>
                                      <Switch
                                        checked={perm.hasAccess}
                                        onCheckedChange={() => togglePermission(pathObj.path, 'hasAccess')}
                                      />
                                    </div>
                                  </div>
                                  
                                  {!isMainConfiguration && (
                                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                                      <div className="flex flex-col items-center gap-1">
                                        <span className="text-[8px] text-slate-500 uppercase font-bold">Add</span>
                                        <Switch
                                          size="sm"
                                          checked={perm.canAdd}
                                          onCheckedChange={() => togglePermission(pathObj.path, 'canAdd')}
                                          disabled={!perm.hasAccess}
                                        />
                                      </div>
                                      <div className="flex flex-col items-center gap-1">
                                        <span className="text-[8px] text-slate-500 uppercase font-bold">Edit</span>
                                        <Switch
                                          size="sm"
                                          checked={perm.canEdit}
                                          onCheckedChange={() => togglePermission(pathObj.path, 'canEdit')}
                                          disabled={!perm.hasAccess}
                                        />
                                      </div>
                                      <div className="flex flex-col items-center gap-1">
                                        <span className="text-[8px] text-slate-500 uppercase font-bold">Del</span>
                                        <Switch
                                          size="sm"
                                          checked={perm.canDelete}
                                          onCheckedChange={() => togglePermission(pathObj.path, 'canDelete')}
                                          disabled={!perm.hasAccess}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {isMainConfiguration && (
                                    <div className="mt-4 p-4 bg-slate-100/50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                      {MODULE_GROUPS.find(g => g.name === "Configuration Module").paths
                                        .filter(p => p.path !== '/configuration')
                                        .map(subPath => {
                                          const subPerm = permissions.find(p => p.pagePath === subPath.path) || { hasAccess: false, canAdd: false, canEdit: false, canDelete: false };
                                          return (
                                            <div key={subPath.path} className="flex flex-col gap-2 p-3 rounded bg-white border border-slate-200 shadow-sm">
                                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <div className="text-xs font-bold text-slate-700">{subPath.label}</div>
                                                <Switch
                                                  size="sm"
                                                  checked={subPerm.hasAccess}
                                                  onCheckedChange={() => togglePermission(subPath.path, 'hasAccess')}
                                                  disabled={!perm.hasAccess}
                                                />
                                              </div>
                                              <div className="grid grid-cols-3 gap-2 pt-1">
                                                <div className="flex flex-col items-center gap-1">
                                                  <span className="text-[8px] text-slate-500 uppercase font-bold">Add</span>
                                                  <Switch
                                                    size="sm"
                                                    checked={subPerm.canAdd}
                                                    onCheckedChange={() => togglePermission(subPath.path, 'canAdd')}
                                                    disabled={!subPerm.hasAccess || !perm.hasAccess}
                                                  />
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                  <span className="text-[8px] text-slate-500 uppercase font-bold">Edit</span>
                                                  <Switch
                                                    size="sm"
                                                    checked={subPerm.canEdit}
                                                    onCheckedChange={() => togglePermission(subPath.path, 'canEdit')}
                                                    disabled={!subPerm.hasAccess || !perm.hasAccess}
                                                  />
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                  <span className="text-[8px] text-slate-500 uppercase font-bold">Del</span>
                                                  <Switch
                                                    size="sm"
                                                    checked={subPerm.canDelete}
                                                    onCheckedChange={() => togglePermission(subPath.path, 'canDelete')}
                                                    disabled={!subPerm.hasAccess || !perm.hasAccess}
                                                  />
                                                </div>
                                              </div>
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
      ) : activeTab === "system" ? (
        /* System Monitor Tab */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-amber-500 flex items-center gap-2">
              <Activity className="w-6 h-6" />
              Raspberry Pi 5 Health
            </h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchSystemStatus} 
              disabled={refreshingSystem}
              className="border-slate-200 text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshingSystem ? 'animate-spin' : ''}`} />
              {refreshingSystem ? 'Refreshing...' : 'Refresh Now'}
            </Button>
          </div>

          {!systemStatus ? (
            <div className="p-12 text-center text-slate-400 border border-slate-200 border-dashed rounded-xl">
              Loading system hardware metrics...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-orange-600" />
                      CPU Temperature
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${systemStatus.cpuTemp === 'N/A' ? 'text-slate-400' : 'text-slate-900'}`}>
                      {systemStatus.cpuTemp}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {systemStatus.cpuTemp === 'N/A' ? 'Only available on Linux/Pi' : 'Real-time SoC thermal sensor'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      RAM Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{systemStatus.ramUsage}</div>
                    <p className="text-xs text-slate-500 mt-1">Total physical memory consumption</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-emerald-600" />
                      Disk Space (Root)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{systemStatus.diskSpace}</div>
                    <p className="text-xs text-slate-500 mt-1">Available system storage capacity</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="w-5 h-5 text-amber-600" />
                    Storage Breakdown
                  </CardTitle>
                  <CardDescription>Size of specific application directories on disk.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {Object.entries(systemStatus.storageBreakdown).map(([name, size]) => (
                      <div key={name} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{name}</div>
                        <div className="text-xl font-bold text-slate-800">{size}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      ) : (
        /* Data Control Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-red-600">Data Cleanup Console</CardTitle>
              <CardDescription>Permanently clear specific database tables. Action cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DATABASE_TABLES.map(table => (
                  <div key={table.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-red-500/30 transition-all group">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-800">{table.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{table.id}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => initiateClearTable(table.id)}
                      disabled={clearingTable === table.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {clearingTable === table.id ? "..." : "Clear"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 border-dashed shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-slate-500">System Information</CardTitle>
              <CardDescription>Database and infrastructure details for Raspberry Pi 5.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Engine</span>
                  <span className="text-slate-700 font-mono">MariaDB 10.11</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Host</span>
                  <span className="text-slate-700 font-mono">digital-studio-db</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">ORM</span>
                  <span className="text-slate-700 font-mono">Hibernate 6.x</span>
                </div>
              </div>
              <div className="p-6 border border-yellow-500/20 bg-yellow-500/5 rounded-xl">
                <h4 className="text-yellow-500 font-bold text-sm uppercase tracking-widest mb-2">Admin Warning</h4>
                <p className="text-xs text-yellow-500/80 leading-relaxed">
                  Data clearing operations are performed directly on the production database. Ensure you have backups before proceeding with table resets.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="text-xl font-bold">Confirm Administrative Action</h3>
              </div>
              <p className="text-slate-500 text-sm">
                You are about to clear all data from <span className="font-bold text-slate-900">'{tableToClear}'</span>. Please enter the Admin password to verify.
              </p>
              <input 
                type="password"
                placeholder="Admin Password"
                className="w-full bg-slate-50 border-slate-200 text-slate-900 px-4 py-3 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 text-slate-400" onClick={() => { setShowPasswordModal(false); setAdminPassword(""); }}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleClearTableConfirm}>
                  Confirm Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
