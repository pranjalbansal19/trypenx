import type { Config } from 'tailwindcss';

export default {
	content: [
		'./index.html',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		extend: {
			colors: {
				brand: {
					DEFAULT: '#22d3ee',
					dark: '#06b6d4',
					muted: '#0ea5b7'
				}
			},
			boxShadow: {
				soft: '0 10px 30px -15px rgba(34,211,238,0.25)'
			}
		}
	},
	plugins: [],
} satisfies Config;


