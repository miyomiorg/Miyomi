import { ActiveBackground } from './backgrounds/ActiveBackground';
import { DeadBackground } from './backgrounds/DeadBackground';
import { WarningBackground } from './backgrounds/WarningBackground';
import { AbandonedBackground } from './backgrounds/AbandonedBackground';

interface ParticleBackgroundProps {
  theme?: 'light' | 'dark';
  appStatus?: string;
}

export function ParticleBackground({ theme = 'dark', appStatus = 'active' }: ParticleBackgroundProps) {
  const normalizedStatus = appStatus.toLowerCase();
  
  if (normalizedStatus === 'dead' || normalizedStatus === 'discontinued') {
    return <DeadBackground theme={theme} />;
  }
  
  if (normalizedStatus === 'abandoned') {
    return <AbandonedBackground theme={theme} />;
  }
  
  if (normalizedStatus === 'suspended' || normalizedStatus === 'dmca') {
    return <WarningBackground theme={theme} type={normalizedStatus as 'dmca' | 'suspended'} />;
  }

  // Default / Active
  return <ActiveBackground theme={theme} />;
}
