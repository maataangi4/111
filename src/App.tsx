import { motion } from 'framer-motion'
import { Dashboard } from './components/Dashboard'
import { ThemeSync } from './components/ThemeSync'

/** Вход по паролю отключён для удобства тестирования — сразу дашборд. */
export default function App() {
  return (
    <>
      <ThemeSync />
      <motion.div
        key="app"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="min-h-svh dark:text-[#f1f1f1]"
      >
        <Dashboard />
      </motion.div>
    </>
  )
}
