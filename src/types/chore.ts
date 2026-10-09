export interface Profile {
  id: string;
  name: string;
  pin: string | null;
  icon: string;
}

export interface TaskRecurrence {
  frequency: 'daily' | 'weekly';
  days_of_week: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

export interface TaskNote {
  author: string;
  text: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  category: 'routine' | 'monetized';
  reward_amount: number;
  assigned_to: string; // profile id or 'up_for_grabs'
  recurrence: TaskRecurrence | null;
  last_completed_date: string | null;
  is_completed_today?: boolean; // For routine tasks
  is_completed?: boolean;       // For monetized tasks
  is_approved?: boolean;        // For monetized tasks
  completed_date?: string | null;
  last_payout_id?: string | null;
  last_payout_date?: string | null;
  notes: TaskNote[];
}

export interface PayoutRecord {
  id: string;
  profile_id: string;
  total_amount: number;
  date_range_start: string;
  date_range_end: string;
  processed_timestamp: string;
  approved_task_ids: string[];
}

export interface ChoreModuleConfig {
  title: string;
  parentPin: string;
  currencySymbol: string;
  defaultProfileId: string;
  showSummaryStats: boolean;
  showBadges: boolean;
  autoCloseModalSeconds: number;
  theme: string;
}
