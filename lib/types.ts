export type NfcTagStatus = 'active' | 'inactive' | 'compromised';

export type ActivityAction =
  | 'tag_registered'
  | 'tag_written'
  | 'tag_cleared'
  | 'tag_status_changed'
  | 'tag_scanned'
  | 'tag_format';

export interface NfcTag {
  id: string;
  serial_number: string;
  label: string | null;
  payload_data: Record<string, unknown>;
  status: NfcTagStatus;
  last_scanned_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  action: ActivityAction;
  tag_id: string | null;
  performed_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined from auth.users via profiles/query
  performer?: AdminUser;
  nfc_tag?: Pick<NfcTag, 'id' | 'serial_number' | 'label'> | null;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export type NfcReadResult = {
  serialNumber: string;
  message: string | null;
  records: string[]; // Simplistic string records
};

export type DetailedNfcRecord = {
  recordType: string;
  mediaType?: string;
  id?: string;
  data: string;
  byteLength: number;
};

export type DetailedNfcReadResult = {
  serialNumber: string;
  recordCount: number;
  messageBytes: number;
  records: DetailedNfcRecord[];
};

export type NfcServiceStatus =
  | 'idle'
  | 'scanning'
  | 'success'
  | 'scanned'
  | 'error'
  | 'unsupported';
