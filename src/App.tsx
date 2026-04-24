import { motion } from 'framer-motion'
import { Dashboard } from './components/Dashboard'
import { Login } from './components/Login'
import { ThemeSync } from './components/ThemeSync'
import { useCrmStore } from './store/useCrmStore'

export default function App() {
  const authenticated = useCrmStore((s) => s.authenticated)

  return (
    <>
      <ThemeSync />
      <motion.div
        key={authenticated ? 'app' : 'login'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="min-h-svh dark:text-[#f1f1f1]"
      >
        {authenticated ? <Dashboard /> : <Login />}
      </motion.div>
    </>
  )
}
