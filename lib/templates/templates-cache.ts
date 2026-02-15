import { TemplateWithTiers } from "@/features/proposals/types/proposals";

interface CacheEntry<T> {
    data: T;
    timestamp: number;
  }
  
  const CACHE_DURATION_MS = 5 * 60 * 1000;
  
  class InMemoryCache<T> {
    private entry: CacheEntry<T> | null = null;
  
    get(): T | null {
      if (!this.entry) return null;
      const isExpired = Date.now() - this.entry.timestamp > CACHE_DURATION_MS;
      return isExpired ? null : this.entry.data;
    }
  
    set(data: T): void {
      this.entry = { data, timestamp: Date.now() };
    }
  
    clear(): void {
      this.entry = null;
    }
  }
  
  export const templatesCache = new InMemoryCache<TemplateWithTiers[]>();