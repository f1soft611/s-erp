export type MessageFolder = 'ALL' | 'INBOX' | 'SENT';

export interface DirectMessage {
  threadId: number;
  messageId: number;
  senderUserId: number;
  senderUserName: string;
  recipientUserId: number;
  recipientUserName: string;
  subject: string | null;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export interface MessageReceipt {
  threadId: number;
  messageId: number;
  senderUserId: number;
  recipientUserId: number;
  subject: string | null;
  content: string;
}

export interface MessageThread {
  threadId: number;
  subject: string | null;
  updatedAt: string;
  otherUserId: number;
  otherUserName: string;
  otherUserProfileImage?: string | null;
  latestContent: string;
  latestMessageAt: string;
  unreadCount: number;
}

export interface MessagePage {
  resultList: MessageThread[];
  hasNext: boolean;
  nextBeforeUpdatedAt: string | null;
  nextBeforeThreadId: number | null;
}

export interface MessageDayPage {
  resultList: DirectMessage[];
  messageDate: string | null;
  hasPrevious: boolean;
}

export interface MessageUserOption {
  userId: string;
  userNm: string;
  departmentNm: string;
  profileImage?: string | null;
}
