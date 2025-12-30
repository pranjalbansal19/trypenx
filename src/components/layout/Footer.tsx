export function Footer() {
	return (
		<footer className="border-t border-white/10 mt-16">
			<div className="container-max py-8 text-xs text-white/60 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
				<p>© {new Date().getFullYear()} CyberSentry. All rights reserved.</p>
				<div className="flex items-center gap-4">
					<span className="badge">ISO-ready</span>
					<span className="badge">GDPR</span>
					<span className="badge">Powered by AI</span>
				</div>
			</div>
		</footer>
	);
}


