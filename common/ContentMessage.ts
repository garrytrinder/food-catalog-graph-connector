export interface ContentMessage {
  action?: 'crawl' | 'item';
  crawl?: 'full' | 'incremental';
  itemId?: string;
}