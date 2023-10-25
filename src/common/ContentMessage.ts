export type CrawlType = 'full' | 'incremental';

export type ItemAction = 'update' | 'delete';

export interface ContentMessage {
  action?: 'crawl' | 'item';
  crawlType?: CrawlType;
  itemAction?: ItemAction;
  itemId?: string;
}