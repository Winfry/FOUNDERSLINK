import type { ReferenceDataService } from '../types/api';
import { mockDelay } from './delay';

export const mockReferenceDataService: ReferenceDataService = {
  async getMetaOptions() {
    await mockDelay();
    return {
      sectors: ['health', 'agri', 'fintech', 'climate', 'retail', 'education', 'logistics', 'other'],
      stages: ['idea', 'mvp', 'early_revenue', 'growth'],
      counties: ['Nairobi', 'Mombasa', 'Kisumu', 'Kiambu', 'Nakuru'],
      instruments: ['equity', 'convertible_note'],
      businessStatuses: ['idea', 'informal', 'registered_business_name', 'limited_company'],
      complianceItems: ['kra_pin', 'brs', 'cr12', 'tax_compliance', 'data_protection', 'single_business_permit'],
    };
  },
};
