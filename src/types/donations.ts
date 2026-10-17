export interface DonationGoal {
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  autoCalc?: boolean;
}

export interface PaymentMethod {
  id: string;
  label: string;
  description: string;
  url: string;
  enabled: boolean;
  iconHint: string;
  type?: 'link' | 'details';
  details?: {
    number?: string;
    email?: string;
    address?: string;
    accountName?: string;
    network?: string;
    instructions?: string;
    qrCodeUrl?: string;
  };
}

export interface TransparencyItem {
  label: string;
  value: string;
}
