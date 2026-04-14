import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'dashboard'
  | 'users'
  | 'coupons'
  | 'subscriptions'
  | 'payments'
  | 'devices'
  | 'support'
  | 'contact-requests'
  | 'integrations'
  | 'analytics'
  | 'team'
  | 'roles'
  | 'audit-logs'
  | 'notifications'
  | 'settings'
  | 'status'
  | 'profile'
  | 'spark'
  | 'shield'
  | 'bell'
  | 'chart'
  | 'user';

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

function IconShell({ size = 20, children, ...props }: SVGProps<SVGSVGElement> & { size?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function AdminIcon({ name, size = 20, className = 'shrink-0', ...props }: IconProps) {
  const common = { className, stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'dashboard':
      return <IconShell size={size} {...props}><path {...common} d="M4 5h7v7H4z" /><path {...common} d="M13 5h7v4h-7z" /><path {...common} d="M13 11h7v8h-7z" /><path {...common} d="M4 14h7v5H4z" /></IconShell>;
    case 'users':
      return <IconShell size={size} {...props}><path {...common} d="M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" /><circle {...common} cx="10" cy="8" r="3" /><path {...common} d="M20 20v-1a3 3 0 0 0-2-2.83" /><path {...common} d="M16 5.34a3 3 0 0 1 0 5.32" /></IconShell>;
    case 'coupons':
      return <IconShell size={size} {...props}><path {...common} d="M20 12a2 2 0 0 1-2-2V7l-6 6 4 4 6-6v-3a2 2 0 0 0-2-2h-3" /><path {...common} d="M4 8a2 2 0 0 1 2-2h7" /><path {...common} d="M8 16a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" /></IconShell>;
    case 'subscriptions':
      return <IconShell size={size} {...props}><path {...common} d="M12 22V9" /><path {...common} d="M5 9h14" /><path {...common} d="M8 9V5a4 4 0 0 1 8 0v4" /><path {...common} d="M7 13h10" /></IconShell>;
    case 'payments':
      return <IconShell size={size} {...props}><path {...common} d="M4 7h16v10H4z" /><path {...common} d="M4 11h16" /><path {...common} d="M8 15h3" /></IconShell>;
    case 'devices':
      return <IconShell size={size} {...props}><rect {...common} x="5" y="7" width="14" height="10" rx="2" /><path {...common} d="M9 18h6" /><path {...common} d="M12 15v3" /></IconShell>;
    case 'support':
    case 'contact-requests':
      return <IconShell size={size} {...props}><path {...common} d="M4 6h16v9H9l-5 4z" /><path {...common} d="M8 10h8" /><path {...common} d="M8 13h5" /></IconShell>;
    case 'integrations':
      return <IconShell size={size} {...props}><path {...common} d="M8 12a4 4 0 0 1 4-4h2" /><path {...common} d="M16 12a4 4 0 0 1-4 4h-2" /><path {...common} d="M12 8v8" /><path {...common} d="M4 12h4" /><path {...common} d="M16 12h4" /></IconShell>;
    case 'analytics':
    case 'chart':
      return <IconShell size={size} {...props}><path {...common} d="M5 19V5" /><path {...common} d="M5 19h14" /><path {...common} d="M8 15l3-4 3 2 4-6" /></IconShell>;
    case 'team':
      return <IconShell size={size} {...props}><circle {...common} cx="9" cy="8" r="3" /><path {...common} d="M4 19v-1a4 4 0 0 1 4-4h1" /><circle {...common} cx="17" cy="10" r="2.5" /><path {...common} d="M13 19v-.5a3.5 3.5 0 0 1 3.5-3.5H18" /></IconShell>;
    case 'roles':
      return <IconShell size={size} {...props}><path {...common} d="M12 3l7 4v10l-7 4-7-4V7z" /><path {...common} d="M12 12l7-4" /><path {...common} d="M12 12v8" /><path {...common} d="M5 8l7 4" /></IconShell>;
    case 'audit-logs':
      return <IconShell size={size} {...props}><path {...common} d="M7 4h10l3 3v13H4V4z" /><path {...common} d="M8 9h8" /><path {...common} d="M8 13h8" /><path {...common} d="M8 17h5" /></IconShell>;
    case 'notifications':
    case 'bell':
      return <IconShell size={size} {...props}><path {...common} d="M15 17H5l1.2-2A8 8 0 0 0 7 11V9a5 5 0 0 1 10 0v2a8 8 0 0 0 .8 4l1.2 2h-4" /><path {...common} d="M10 17a2 2 0 0 0 4 0" /></IconShell>;
    case 'settings':
      return <IconShell size={size} {...props}><path {...common} d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path {...common} d="M19 12a7 7 0 0 0-.1-1l2-1.4-2-3.5-2.3.8a7 7 0 0 0-1.7-1l-.4-2.4H9.5l-.4 2.4a7 7 0 0 0-1.7 1L5.1 6.1l-2 3.5 2 1.4a7 7 0 0 0 0 2l-2 1.4 2 3.5 2.3-.8a7 7 0 0 0 1.7 1l.4 2.4h4.8l.4-2.4a7 7 0 0 0 1.7-1l2.3.8 2-3.5-2-1.4c.1-.3.1-.7.1-1Z" /></IconShell>;
    case 'status':
      return <IconShell size={size} {...props}><path {...common} d="M4 12h4l2-5 4 10 2-5h4" /></IconShell>;
    case 'profile':
    case 'user':
      return <IconShell size={size} {...props}><circle {...common} cx="12" cy="8" r="3.5" /><path {...common} d="M4 20v-1a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1" /></IconShell>;
    case 'spark':
      return <IconShell size={size} {...props}><path {...common} d="M12 3l1.8 4.6L18 9l-4.2 1.3L12 15l-1.8-4.7L6 9l4.2-1.4L12 3Z" /><path {...common} d="M5 18l.8 2 2 1 .8-2 1-2-2 .7-2.6-.7Z" /></IconShell>;
    case 'shield':
      return <IconShell size={size} {...props}><path {...common} d="M12 3l7 3v5c0 4.4-3 8.4-7 10-4-1.6-7-5.6-7-10V6l7-3Z" /><path {...common} d="M9.5 12.2l1.8 1.8 3.7-4" /></IconShell>;
    default:
      return <IconShell size={size} {...props}><path {...common} d="M5 12h14" /></IconShell>;
  }
}