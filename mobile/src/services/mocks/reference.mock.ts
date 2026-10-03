import type { ReferenceDataService } from '../types/api';
import { BUSINESS_SECTORS, KENYAN_COUNTIES, PROJECT_TYPES } from './kenya-data';
import { mockDelay } from './delay';

export const mockReferenceDataService: ReferenceDataService = {
  async getCounties() {
    await mockDelay(200);
    return KENYAN_COUNTIES;
  },
  async getSectors() {
    await mockDelay(200);
    return BUSINESS_SECTORS;
  },
  async getProjectTypes() {
    await mockDelay(200);
    return PROJECT_TYPES;
  },
};
