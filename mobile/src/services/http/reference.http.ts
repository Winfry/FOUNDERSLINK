import type { ReferenceDataService } from '../types/api';
import { get } from './client';

export const httpReferenceDataService: ReferenceDataService = {
  // The lists every dropdown is built from, under the names the screens use.
  async getMetaOptions() {
    const [options, items] = await Promise.all([
      get<Record<string, unknown>>('/meta/options'),
      get<{ id: string }[]>('/compliance/items'),
    ]);
    return {
      ...options,
      businessStatuses: options.business_statuses,
      complianceItems: items.map((item) => item.id),
    };
  },
};
