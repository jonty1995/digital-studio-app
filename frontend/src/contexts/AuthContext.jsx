import { createContext, useContext, useState, useEffect } from "react"
import { api } from "../services/api"

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem("token") || null)
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.get("/auth/me")
      .then(data => {
        setUser({ username: data.username, role: data.role })
        setPermissions(data.permissions)
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
      setUser({ username: data.username, role: data.role })
      setPermissions(data.permissions)
      return true
    } catch (error) {
      console.error("Login failed", error)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    sessionStorage.clear()
    setToken(null)
    setUser(null)
    setPermissions([])
  }

  return (
    <AuthContext.Provider value={{ user, token, permissions, login, logout, isLoading: loading }}>
      {children}
    </AuthContext.Provider>
  )
}
