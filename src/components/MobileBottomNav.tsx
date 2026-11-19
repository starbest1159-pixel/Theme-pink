import { AppView } from '../types/series';

interface MobileBottomNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

export function MobileBottomNav({ activeView, onNavigate }: MobileBottomNavProps) {
  const items: {
    id: AppView;
    label: string;
    iconSrc: string;
  }[] = [
    {
      id: 'home',
      label: 'หน้าหลัก',
      iconSrc: '/assets/bannlai/nav-icon-home.png',
    },
    {
      id: 'catalog',
      label: 'ซีรีส์',
      iconSrc: '/assets/bannlai/nav-icon-catalog.png',
    },
    {
      id: 'favorites',
      label: 'รายการโปรด',
      iconSrc: '/assets/bannlai/nav-icon-favorites.png',
    },
    {
      id: 'history',
      label: 'ประวัติ',
      iconSrc: '/assets/bannlai/nav-icon-history.png',
    },
    {
      id: 'settings',
      label: 'ตั้งค่า',
      iconSrc: '/assets/bannlai/nav-icon-settings.png',
    },
  ];

  return (
    <nav
      aria-label="เมนูนำทางมือถือ"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-[64px] px-1.5 bg-white dark:bg-slate-950 border-t-2 border-rose-200 dark:border-rose-900/70 shadow-[0_-6px_22px_rgba(255,30,110,0.12)] grid grid-cols-5 items-center gap-1.5"
    >
      {items.map((item) => {
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className={`relative w-full h-[52px] px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1E6E] ${
              isActive
                ? 'bg-gradient-to-b from-rose-100 via-pink-100 to-rose-200/85 dark:from-rose-950 dark:to-pink-900/70 border-2 border-[#FF1E6E] shadow-sm shadow-rose-500/25'
                : 'bg-slate-50 dark:bg-slate-900 border border-slate-300/85 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700 shadow-2xs'
            }`}
          >
            <img
              src={item.iconSrc}
              alt=""
              aria-hidden="true"
              className={`w-[23px] h-[23px] object-contain pointer-events-none select-none ${
                isActive ? 'scale-105' : ''
              } drop-shadow-[0_1px_1px_rgba(15,23,42,0.14)]`}
            />
            <span
              className={`text-[10.5px] leading-none tracking-tight whitespace-nowrap ${
                isActive
                  ? 'font-extrabold text-[#C9004E] dark:text-rose-200'
                  : 'font-bold text-slate-900 dark:text-slate-100'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
