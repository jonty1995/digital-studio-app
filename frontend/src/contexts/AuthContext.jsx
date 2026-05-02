import { createContext, useContext, useState, useEffect } from "react"
import { api } from "../services/api"

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem("token") || null)
  const [permissions, setPermissions] = useState([])
  const [pagePermissions, setPagePermissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.get("/auth/me")
      .then(data => {
        setUser({ id: data.id, username: data.username, role: data.role })
        setPermissions(data.permissions)
        setPagePermissions(data.pagePermissions || [])
      })
      .catch(() => {
        logout()
      })
      .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (username, password) => {
    try {
      const data = await api.post("/auth/login", { username, password })
      localStorage.setItem("token", data.token)
      setToken(data.token)
      setUser({ id: data.id, username: data.username, role: data.role })
      setPermissions(data.permissions)
      setPagePermissions(data.pagePermissions || [])
      return true
    } catch (error) {
      console.error("Login failed", error)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
    setPermissions([])
    setPagePermissions([])
  }

  const hasPermission = (path, action = "access") => {
    // Admin bypass: Admins have access to everything by default.
    // This ensures new routes work immediately for admins.
    if (user?.role === "ADMIN") return true;

    const perm = pagePermissions.find(p => p.pagePath === path);
    if (!perm) {
      return false;
    }
    if (action === "access") return perm.hasAccess;
    if (action === "add") return perm.canAdd;
    if (action === "edit") return perm.canEdit;
    if (action === "delete") return perm.canDelete;
    return false;
  };

  const refreshPermissions = async () => {
    try {
      const data = await api.get("/auth/me")
      setUser({ id: data.id, username: data.username, role: data.role })
      setPermissions(data.permissions)
      setPagePermissions(data.pagePermissions || [])
    } catch (error) {
      console.error("Failed to refresh permissions", error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, permissions, setPermissions, pagePermissions, setPagePermissions, hasPermission, login, logout, refreshPermissions, isLoading: loading }}>
      {children}
    </AuthContext.Provider>
  )
}
