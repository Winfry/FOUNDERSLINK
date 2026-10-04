import type { ReferenceDataService } from '../types/api';
import { get } from './client';

type Labelled = { id: string; label: string }[];

export const httpReferenceDataService: ReferenceDataService = {
  // The lists every dropdown is built from, under the names the screens
  // use, with `labels`: what to show a person for each id.
  async getMetaOptions() {
    const [options, items] = await Promise.all([
      get<Record<string, unknown> & { labels: Record<string, Labelled> }>('/meta/options'),
      get<{ id: string; title: string }[]>('/compliance/items'),
    ]);
    const labels: Record<string, string> = {};
    for (const list of Object.values(options.labels)) for (const { id, label } of list) labels[id] = label;
    for (const item of items) labels[item.id] = item.title;
    return {
      ...options,
      businessStatuses: options.business_statuses,
      complianceItems: items.map((item) => item.id),
      labels,
    };
  },
};
