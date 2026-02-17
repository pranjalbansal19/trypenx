import type { ContractType } from '../types/admin'

export const contractTypeLabels: Record<ContractType, string> = {
  Basic: 'Basic (Vulnerability Scan)',
  BasicPlus: 'PenX BasicPlus (Monthly Vulnerability Scans + Annual Pen Test)',
  Foundation: 'Foundation',
  Pro: 'Pro',
  Enterprise: 'Enterprise',
}

export function formatContractType(type: ContractType): string {
  return contractTypeLabels[type] ?? type
}
