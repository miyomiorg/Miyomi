import { apiDataService } from './apiDataService';
import type { AppData, ExtensionData, FAQData, GuideCategoryData, GuideData } from '../types/data';

const service = apiDataService;

export const dataService = {
  getApps: (): Promise<AppData[]> => service.getApps(),
  getExtensions: (): Promise<ExtensionData[]> => service.getExtensions(),
  getFAQs: (): Promise<FAQData[]> => service.getFAQs(),
  getGuideCategories: (): Promise<GuideCategoryData[]> => service.getGuideCategories(),
  getGuideBySlug: (slug: string): Promise<GuideData | null> => service.getGuideBySlug(slug),
};
