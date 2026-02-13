import type { AddOnCategory, CustomerAddOn } from '../types/admin'

export const addOnCatalog: CustomerAddOn[] = [
  {
    code: 'extra_ips',
    label: 'Extra IPs',
    category: 'recurring',
  },
  {
    code: 'recurring_retest',
    label: 'Recurring Retest Entitlement',
    category: 'recurring',
  },
  {
    code: 'emergency_response',
    label: 'Emergency Response',
    category: 'recurring',
  },
  {
    code: 'white_box',
    label: 'White Box Testing',
    category: 'one_off',
  },
  {
    code: 'consultancy_hours',
    label: 'Consultancy Hours',
    category: 'one_off',
  },
  {
    code: 'single_retest',
    label: 'Single Retest',
    category: 'one_off',
  },
]

export const addOnCategoryLabels: Record<AddOnCategory, string> = {
  recurring: 'Recurring add-ons',
  one_off: 'One-off add-ons',
}

export function groupAddOns(addOns: CustomerAddOn[] = []) {
  return addOns.reduce(
    (acc, addOn) => {
      acc[addOn.category].push(addOn)
      return acc
    },
    { recurring: [] as CustomerAddOn[], one_off: [] as CustomerAddOn[] }
  )
}

export function normalizeAddOns(value: CustomerAddOn[] | null | undefined) {
  return Array.isArray(value) ? value : []
}
