import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Sparkles, LogIn, LogOut, ExternalLink } from 'lucide-react'
import cybersentryLogo from '../../assets/cybersentry.png'
import { useAppStore } from '../../state/store'
import { useState } from 'react'
import { CheckoutModal } from '../CheckoutModal'

export function Navbar() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)
  const logout = useAppStore((s) => s.logout)
  const subscription = useAppStore((s) => s.subscription)
  const navigate = useNavigate()
  const [showCheckout, setShowCheckout] = useState(false)

  // Show upgrade button if user is logged in but not fully subscribed to all 3 services
  const hasAllSubscriptions =
    subscription.remediation &&
    subscription.humanValidation &&
    subscription.socHotline
  const needsUpgrade = isAuthenticated && !hasAllSubscriptions

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <>
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="container-max h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={cybersentryLogo}
              alt="CyberSentry"
              className="h-8 w-auto"
            />
            <span className="ml-2 text-xs badge">AI Pen Test</span>
          </Link>
          {isAuthenticated && (
            <nav className="hidden sm:flex items-center gap-6 text-sm">
              {/* Hidden for now - will be enabled in future */}
              {false && (
                <>
                  <NavLink
                    className={({ isActive }) =>
                      isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                    }
                    to="/reports"
                  >
                    Reports
                  </NavLink>
                  <NavLink
                    className={({ isActive }) =>
                      isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                    }
                    to="/dashboard"
                  >
                    Dashboard
                  </NavLink>
                  <NavLink
                    className={({ isActive }) =>
                      isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                    }
                    to="/upload"
                  >
                    Upload
                  </NavLink>
                  <NavLink
                    className={({ isActive }) =>
                      isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                    }
                    to="/admin"
                  >
                    Admin
                  </NavLink>
                  <NavLink
                    className={({ isActive }) =>
                      isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                    }
                    to="/reseller"
                  >
                    Reseller
                  </NavLink>
                </>
              )}
            </nav>
          )}
          <div className="flex items-center gap-3">
            <a
              href="/admin/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <ExternalLink size={18} className="text-yellow-500 icon-wave flex-shrink-0" />
              <span className="hidden sm:inline">Navigate to Admin Control Center</span>
            </a>
            {/* Hidden for now - will be enabled in future */}
            {false && (
              <>
                {isAuthenticated ? (
                  <>
                    {needsUpgrade && (
                      <button
                        onClick={() => setShowCheckout(true)}
                        className="btn btn-primary"
                      >
                        <Sparkles size={16} /> Upgrade
                      </button>
                    )}
                    <button onClick={handleLogout} className="btn btn-outline">
                      <LogOut size={16} /> Logout
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="btn btn-primary">
                    <LogIn size={16} /> Login
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </header>
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
      />
    </>
  )
}
