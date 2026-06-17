import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor: añadir token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('padel_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Interceptor: manejo global de errores
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('padel_token')
      window.location.href = '/login'
    } else if (err.response?.status === 402 && err.response?.data?.error === 'TRIAL_EXPIRED') {
      window.location.href = '/trial-expired'
    }
    return Promise.reject(err)
  }
)

export default api
