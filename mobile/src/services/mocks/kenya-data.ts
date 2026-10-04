export const BUSINESS_SECTORS = [
  { id: 'health', label: 'Health' },
  { id: 'fintech', label: 'Fintech' },
  { id: 'agri', label: 'Agriculture' },
];

export const PROJECT_TYPES = ['impact', 'commercial'];

export const KENYAN_COUNTIES = [
  { code: '047', name: 'Nairobi' },
  { code: '001', name: 'Mombasa' },
  { code: '042', name: 'Kisumu' },
  { code: '022', name: 'Kiambu' },
  { code: '043', name: 'Kilifi' },
  { code: '037', name: 'Nakuru' },
];

export function formatKes(amount: number): string {
  // Written the way it is written in Kenya, "KSh 1,000,000", the same on every device.
  return `KSh ${Math.round(amount).toLocaleString('en-KE')}`;
}

export function formatPhone254(phone: string): boolean {
  return /^\+254[17]\d{8}$/.test(phone.replace(/\s/g, ''));
}
