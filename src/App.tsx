import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { Login } from './components/Login'
import { Register } from './components/Register'
import { ThemeSync } from './components/ThemeSync'
import { useAuthStore } from './store/useAuthStore'

function getJoinToken(): string | null {
  const hash = window.location.hash
  const match = hash.match(/^#join=([a-f0-9]{32})$/)
  return match ? match[1] : null
}

export default function App() {
  const init = useAuthStore((s) => s.init)
  const session = useAuthStore((s) => s.session)
  const loading = useAuthStore((s) => s.loading)
  const [joinToken, setJoinToken] = useState<string | null>(getJoinToken)

  useEffect(() => { void init() }, [init])

  useEffect(() => {
    const onHash = () => setJoinToken(getJoinToken())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  if (joinToken) {
    return (
      <>
        <ThemeSync />
        <Register token={joinToken} />
      </>
    )
  }

  return (
    <>
      <ThemeSync />
      <motion.div
        key={session ? 'app' : 'login'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="min-h-svh dark:text-[#f1f1f1]"
      >
        {session ? <Dashboard /> : <Login />}
      </motion.div>
    </>
  )
}
