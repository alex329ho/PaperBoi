export type NotificationType = 'daily_summary' | 'breaking_news' | 'reminder';

export interface NotificationData {
  type: NotificationType;
  article_count?: number;
  article_id?: string;
  topic?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data: NotificationData;
}

export interface NotificationPreferences {
  enabled: boolean;
  topics?: string[];
  dailySummaryTime?: string;
  muteTopics?: string[];
  deepLinkBasePath?: string;
}

export interface NotificationHistoryEntry {
  id: string;
  payload: NotificationPayload;
  receivedAt: string;
  openedAt?: string;
}
