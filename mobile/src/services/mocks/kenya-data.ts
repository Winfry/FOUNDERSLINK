export const KENYAN_COUNTIES = [
  { code: '047', name: 'Nairobi' },
  { code: '001', name: 'Mombasa' },
  { code: '042', name: 'Kisumu' },
  { code: '022', name: 'Kiambu' },
  { code: '043', name: 'Kilifi' },
  { code: '037', name: 'Nakuru' },
  { code: '012', name: 'Meru' },
  { code: '015', name: 'Kajiado' },
];

export const BUSINESS_SECTORS = [
  { id: 'agritech', label: 'Agritech & Agriculture' },
  { id: 'fintech', label: 'Fintech & Payments' },
  { id: 'logistics', label: 'Logistics & Mobility' },
  { id: 'health', label: 'Health & Wellness' },
  { id: 'education', label: 'Edtech' },
  { id: 'retail', label: 'Retail & E-commerce' },
  { id: 'energy', label: 'Clean Energy' },
  { id: 'manufacturing', label: 'Manufacturing' },
];

export const PROJECT_TYPES = [
  'impact',
  'commercial',
  'export',
  'agriculture',
  'fintech',
  'climate',
  'women-led',
  'youth-led',
];

import type { DiscoverFounderCard, PlatformFounderPeer, PlatformInvestorCard } from '../../types';

export const MOCK_FOUNDERS: DiscoverFounderCard[] = [
  {
    id: 'f1',
    businessName: 'Maziwa Fresh Co.',
    sector: 'Agritech & Agriculture',
    stage: 'early_revenue',
    county: 'Kiambu',
    fundingAskKes: 8_500_000,
    percentRaised: 35,
    verifiedDocumentsBadge: true,
    matchReasons: ['Matches your sector focus', 'Within your ticket size range', 'Based in your preferred region'],
    projectTypes: ['agriculture', 'impact'],
  },
  {
    id: 'f2',
    businessName: 'PesaLink Solutions',
    sector: 'Fintech & Payments',
    stage: 'mvp',
    county: 'Nairobi',
    fundingAskKes: 15_000_000,
    percentRaised: 12,
    verifiedDocumentsBadge: false,
    matchReasons: ['Matches your fintech interest', 'Early-stage fit'],
    projectTypes: ['fintech', 'commercial'],
  },
  {
    id: 'f3',
    businessName: 'Coast Export Hub',
    sector: 'Logistics & Mobility',
    stage: 'growth',
    county: 'Mombasa',
    fundingAskKes: 25_000_000,
    percentRaised: 60,
    verifiedDocumentsBadge: true,
    matchReasons: ['Export-focused project', 'Strong traction in Mombasa'],
    projectTypes: ['export', 'commercial'],
  },
  {
    id: 'f4',
    businessName: 'SolarGrid Kenya',
    sector: 'Clean Energy',
    stage: 'early_revenue',
    county: 'Nakuru',
    fundingAskKes: 12_000_000,
    percentRaised: 28,
    verifiedDocumentsBadge: true,
    matchReasons: ['Clean energy focus', 'Strong county partnerships'],
    projectTypes: ['climate', 'impact'],
  },
  {
    id: 'f5',
    businessName: 'Nairobi Health Connect',
    sector: 'Health & Wellness',
    stage: 'mvp',
    county: 'Nairobi',
    fundingAskKes: 6_500_000,
    percentRaised: 18,
    verifiedDocumentsBadge: false,
    matchReasons: ['Healthtech growth in Nairobi'],
    projectTypes: ['impact', 'commercial'],
  },
  {
    id: 'f6',
    businessName: 'Kilifi Aqua Farms',
    sector: 'Agritech & Agriculture',
    stage: 'early_revenue',
    county: 'Kilifi',
    fundingAskKes: 9_000_000,
    percentRaised: 42,
    verifiedDocumentsBadge: true,
    matchReasons: ['Coastal aquaculture', 'Women-led team'],
    projectTypes: ['agriculture', 'women-led'],
  },
];

/** Other approved founders visible to founders on the platform (excludes your own business). */
export const MOCK_PLATFORM_FOUNDER_PEERS: PlatformFounderPeer[] = MOCK_FOUNDERS.filter(
  (f) => f.id !== 'f1',
).map((f) => ({
  id: f.id,
  businessName: f.businessName,
  sector: f.sector,
  county: f.county,
  stage: f.stage.replace('_', ' '),
}));

export const MOCK_PLATFORM_INVESTORS: PlatformInvestorCard[] = [
  {
    id: 'inv-james',
    name: 'James Kariuki',
    focusAreas: ['Agritech', 'Impact'],
    ticketRangeLabel: 'KES 500K – 5M',
    county: 'Nairobi',
    relationship: 'in_your_group',
  },
  {
    id: 'inv-amina',
    name: 'Amina Hassan',
    focusAreas: ['Fintech', 'Women-led'],
    ticketRangeLabel: 'KES 1M – 8M',
    county: 'Mombasa',
    relationship: 'in_your_group',
  },
  {
    id: 'inv-david',
    name: 'David Otieno',
    focusAreas: ['Logistics', 'Commercial'],
    ticketRangeLabel: 'KES 750K – 3M',
    county: 'Kisumu',
    relationship: 'in_your_group',
  },
  {
    id: 'inv-michael',
    name: 'Michael Njenga',
    focusAreas: ['Growth equity', 'Fintech'],
    ticketRangeLabel: 'KES 2M – 10M',
    county: 'Nairobi',
    relationship: 'on_platform',
  },
  {
    id: 'inv-grace',
    name: 'Grace Wambui',
    focusAreas: ['Health', 'Edtech'],
    ticketRangeLabel: 'KES 500K – 2M',
    county: 'Kiambu',
    relationship: 'pending_request',
  },
];

export function formatKes(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPhone254(phone: string): boolean {
  return /^\+254[17]\d{8}$/.test(phone.replace(/\s/g, ''));
}

export const ABSA_DEPOSIT_DETAILS = {
  bankName: 'Absa Bank Kenya',
  accountName: 'FounderLink Escrow — Maziwa Fresh Co.',
  accountNumber: '****4521',
  branch: 'Westlands',
  paybill: '303030',
  referenceHint: 'Use your group member ID as payment reference',
};
