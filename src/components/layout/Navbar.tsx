import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ShieldCheck, Sparkles, LogIn, LogOut } from 'lucide-react'
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
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur sticky top-0 z-50">
        <div className="container-max h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <ShieldCheck className="text-brand" />
            <span className="font-semibold tracking-wide">CyberSentry</span>
            <span className="ml-2 text-xs badge">AI Pen Test</span>
          </Link>
          {isAuthenticated && (
            <nav className="hidden sm:flex items-center gap-6 text-sm">
              {/* Hidden for now - will be enabled in future */}
              {false && (
                <>
                  <NavLink
                    className={({ isActive }) =>
                      isActive ? 'text-white' : 'text-white/70 hover:text-white'
                    }
                    to="/reports"
                  >
                    Reports
                  </NavLink>
                  <NavLink
                    className={({ isActive }) =>
                      isActive ? 'text-white' : 'text-white/70 hover:text-white'
                    }
                    to="/dashboard"
                  >
                    Dashboard
                  </NavLink>
                  <NavLink
                    className={({ isActive }) =>
                      isActive ? 'text-white' : 'text-white/70 hover:text-white'
                    }
                    to="/upload"
                  >
                    Upload
                  </NavLink>
                  <NavLink
                    className={({ isActive }) =>
                      isActive ? 'text-white' : 'text-white/70 hover:text-white'
                    }
                    to="/admin"
                  >
                    Admin
                  </NavLink>
                  <NavLink
                    className={({ isActive }) =>
                      isActive ? 'text-white' : 'text-white/70 hover:text-white'
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
