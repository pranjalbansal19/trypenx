import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TenantPlan = 'free' | 'pro';

export interface VulnerabilityItem {
	id: string;
	severity: 'low' | 'medium' | 'high' | 'critical';
	title: string;
	description: string;
	recommendation: string;
}

export interface SubscriptionState {
	plan: boolean; // Base plan subscribed
	remediation: boolean;
	humanValidation: boolean;
	socHotline: boolean;
}

interface AppState {
	isAuthenticated: boolean;
	userEmail: string | null;
	currentDomain: string | null;
	plan: TenantPlan;
	subscription: SubscriptionState;
	aiReconScore: number | null;
	vulnerabilities: VulnerabilityItem[];
	login: (email: string) => void;
	logout: () => void;
	setDomain: (domain: string | null) => void;
	setPlan: (plan: TenantPlan) => void;
	setSubscription: (sub: Partial<SubscriptionState>) => void;
	setReconScore: (score: number | null) => void;
	setVulnerabilities: (items: VulnerabilityItem[]) => void;
}

export const useAppStore = create<AppState>()(
	persist(
		(set) => ({
			isAuthenticated: false,
			userEmail: null,
			currentDomain: null,
			plan: 'free',
			subscription: {
				plan: false,
				remediation: false,
				humanValidation: false,
				socHotline: false,
			},
			aiReconScore: null,
			vulnerabilities: [],
			login: (email) => set({ isAuthenticated: true, userEmail: email }),
			logout: () => set({ isAuthenticated: false, userEmail: null }),
			setDomain: (domain) => set({ currentDomain: domain }),
			setPlan: (plan) => set({ plan }),
			setSubscription: (sub) => set((state) => ({ subscription: { ...state.subscription, ...sub } })),
			setReconScore: (score) => set({ aiReconScore: score }),
			setVulnerabilities: (items) => set({ vulnerabilities: items }),
		}),
		{ name: 'cybersentry-auth' }
	)
);


