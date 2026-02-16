import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';

import './src/app/globals.css';

// Import pages
import Dashboard from './src/app/page';
import NewDayPage from './src/app/day/new/page';
import NewShiftPage from './src/app/day/[id]/new-shift/page';
import MarkPage from './src/app/day/[id]/mark/page';
import DaySummaryPage from './src/app/day/[id]/summary/page';
import WeekPage from './src/app/week/page';
import SettingsPage from './src/app/settings/page';
import PickersPage from './src/app/settings/pickers/page';
import OrchardsPage from './src/app/settings/orchards/page';
import BackupPage from './src/app/backup/page';
import DebugPage from './src/app/settings/debug/page';

// Components
import { BottomNav } from './src/components/layout/BottomNav';
import { SettingsProvider } from './src/lib/SettingsContext';

const App = () => {
  return (
    <SettingsProvider>
      <HashRouter>
        <div className="min-h-screen bg-gray-100 pb-safe">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/day/new" element={<NewDayPage />} />
            <Route path="/day/:id/new-shift" element={<NewShiftPage />} />
            <Route path="/day/:id/mark" element={<MarkPage />} />
            <Route path="/day/:id/summary" element={<DaySummaryPage />} />
            <Route path="/week" element={<WeekPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/pickers" element={<PickersPage />} />
            <Route path="/settings/orchards" element={<OrchardsPage />} />
            <Route path="/settings/debug" element={<DebugPage />} />
            <Route path="/backup" element={<BackupPage />} />
          </Routes>
          <BottomNav />
        </div>
      </HashRouter>
    </SettingsProvider>
  );
};

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);