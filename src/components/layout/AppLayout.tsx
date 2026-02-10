import { PropsWithChildren } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ToastContainer } from '../ToastContainer';

export function AppLayout({ children }: PropsWithChildren) {
	return (
		<div className="min-h-screen flex flex-col">
			<ToastContainer />
			<Navbar />
			<main className="flex-1">
				{children}
			</main>
			<Footer />
		</div>
	);
}

