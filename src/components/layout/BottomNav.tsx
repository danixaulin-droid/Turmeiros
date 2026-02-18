"use client";

import React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { Home, CheckSquare, Calendar, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

export function BottomNav() {
  const pathname = usePathname();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  // Logic: 
  // 1. Is there an OPEN day? (Prioritize this for "Mark")
  // 2. Is there a CLOSED day today? (Use this for "Day" view if no open day)
  
  const openWorkday = useLiveQuery(
    () => db.workdays.where('status').equals('open').last()
  );

  const todayWorkday = useLiveQuery(
    () => db.workdays.where('date').equals(todayStr).first()
  );

  // Link Targets
  const markTarget = openWorkday ? `/day/${openWorkday.id}/mark` : '/day/new';
  const dayTarget = openWorkday 
      ? `/day/${openWorkday.id}/summary` 
      : todayWorkday 
          ? `/day/${todayWorkday.id}/summary` 
          : null;

  const isActive = (path: string) => {
      if (path === '/') return pathname === '/';
      return pathname.startsWith(path);
  }

  const navItems = [
    { 
      label: 'Início', 
      icon: Home, 
      path: '/', 
      exact: true 
    },
    { 
      label: 'Marcar', 
      icon: CheckSquare, 
      path: markTarget,
      highlight: !!openWorkday // Green highlight if active day
    },
    { 
      label: 'Dia', 
      icon: Calendar, 
      path: dayTarget || '#',
      disabled: !dayTarget
    },
    { 
      label: 'Semana', 
      icon: CalendarDays, 
      path: '/week' 
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-900 h-20 z-[90] pb-safe flex justify-around items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const active = item.exact ? pathname === item.path : isActive(item.path);
        const Icon = item.icon;
        
        if (item.disabled) {
           return (
             <div key={item.label} className="flex flex-col items-center justify-center w-full h-full opacity-30 cursor-not-allowed">
               <Icon className="w-7 h-7 mb-1" />
               <span className="text-xs font-bold text-gray-500">{item.label}</span>
             </div>
           );
        }

        return (
          <Link 
            key={item.label} 
            href={item.path}
            className={`flex flex-col items-center justify-center w-full h-full transition-all active:scale-95
              ${active ? 'text-blue-800' : 'text-gray-500 hover:text-gray-900'}
            `}
          >
            <div className={`
              p-1.5 rounded-xl mb-1 transition-colors
              ${active ? 'bg-blue-100' : 'bg-transparent'}
              ${item.highlight && !active ? 'bg-green-100 text-green-800' : ''}
              ${item.highlight && active ? 'bg-green-200 text-green-900' : ''}
            `}>
                <Icon className={`w-6 h-6 stroke-[2.5px] ${active ? 'text-blue-900' : ''} ${item.highlight ? 'text-green-700' : ''}`} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wide ${active ? 'text-blue-900' : ''}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}