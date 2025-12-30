import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../state/store';
import { LogIn } from 'lucide-react';

export function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const login = useAppStore((s) => s.login);
	const navigate = useNavigate();

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		// Mock login - in production, validate credentials via API
		await new Promise((resolve) => setTimeout(resolve, 800));
		login(email || 'user@example.com');
		setLoading(false);
		const redirect = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
		navigate(redirect);
	}

	return (
		<div className="container-max py-12 flex items-center justify-center min-h-[calc(100vh-4rem)]">
			<div className="glass rounded-xl p-8 w-full max-w-md">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
					<p className="text-white/70">Sign in to access your Pen Test reports</p>
				</div>
				<form onSubmit={handleLogin} className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-2">Email</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@example.com"
							className="w-full rounded-md bg-white/5 border border-white/10 px-4 py-2 outline-none focus:border-brand"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium mb-2">Password</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="••••••••"
							className="w-full rounded-md bg-white/5 border border-white/10 px-4 py-2 outline-none focus:border-brand"
							required
						/>
					</div>
					<button type="submit" className="btn btn-primary w-full" disabled={loading}>
						<LogIn size={16} /> {loading ? 'Signing in...' : 'Sign In'}
					</button>
					<p className="text-xs text-white/50 text-center">
						Demo mode: Any email/password combination works
					</p>
				</form>
			</div>
		</div>
	);
}


