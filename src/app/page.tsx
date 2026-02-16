import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Workday, Shift } from '../lib/db';
import { format } from 'date-fns';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PlayCircle, ListTodo, Settings, HardDriveDownload, CalendarDays, Settings2, AlertOctagon, ArrowRight, CheckCircle2, Lock, Accessibility, Download } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Header } from '../components/layout/Header';
import { useSettings } from '../lib/SettingsContext';

export default function Dashboard() {
  const { isEasyMode, toggleEasyMode } = useSettings();
  const [activeWorkday, setActiveWorkday] = useState<Workday | null>(null);
  const [latestShift, setLatestShift] = useState<Shift | null>(null);
  const [todayTotalBoxes, setTodayTotalBoxes] = useState(0);
  const [dbError, setDbError] = useState(false);
  
  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // PART 1: Persistence Check
  useEffect(() => {
    (db as any).open().catch((err: any) => {
      console.error('Failed to open db: ' + (err.stack || err));
      setDbError(true);
    });
  }, []);

  // PART 2: PWA Install Listener
  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    // Show the install prompt
    installPrompt.prompt();
    // Wait for the user to respond to the prompt
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setInstallPrompt(null); // Hide button
      } else {
        console.log('User dismissed the install prompt');
      }
    });
  };

  useLiveQuery(async () => {
    try {
      // 1. Prioritize OPEN day
      let workday = await db.workdays.where('status').equals('open').last();
      
      // 2. If no open day, find ANY day for today to show stats (could be closed)
      if (!workday) {
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          workday = await db.workdays.where('date').equals(todayStr).first();
      }
      
      setActiveWorkday(workday || null);

      if (workday) {
        const shifts = await db.shifts.where('workdayId').equals(workday.id).toArray();
        const currentShift = shifts.sort((a,b) => b.createdAt - a.createdAt)[0];
        setLatestShift(currentShift || null);

        const counts = await db.counts.where('workdayId').equals(workday.id).toArray();
        const boxes = counts.reduce((acc, c) => acc + c.boxes, 0);
        setTodayTotalBoxes(boxes);
      }
    } catch (e) {
      console.error(e);
      setDbError(true);
    }
  });

  if (dbError) {
    return (
      <div className="min-h-screen bg-red-50 p-6 flex flex-col items-center justify-center text-center">
        <AlertOctagon className="w-20 h-20 text-red-600 mb-6" />
        <h1 className="text-3xl font-black text-red-900 mb-4">Erro no Banco de Dados</h1>
        <p className="text-lg text-red-800 mb-8 font-medium">
          O aplicativo não conseguiu acessar a memória do celular.
          Isso acontece se estiver em "Aba Privada" ou sem espaço.
        </p>
        <Button onClick={() => window.location.reload()} variant="danger" size="xl">Tentar Recarregar</Button>
      </div>
    );
  }

  const isDayOpen = activeWorkday?.status !== 'closed'; // Default to open if status is undefined

  // --- EASY MODE DASHBOARD ---
  if (isEasyMode) {
    return (
        <div className="min-h-screen bg-white pb-32">
            <header className="bg-blue-800 text-white p-6 shadow-lg flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-wide">Turmeiro Fácil</h1>
                    <p className="text-blue-200 font-bold text-sm">Modo Simplificado Ativo</p>
                </div>
                <button onClick={toggleEasyMode} className="bg-blue-900 p-2 rounded text-xs font-bold border border-blue-400">
                    Sair
                </button>
            </header>

            <main className="p-4 space-y-6 max-w-md mx-auto">
                {/* PWA INSTALL BUTTON (Easy Mode) */}
                {installPrompt && (
                  <button 
                    onClick={handleInstallClick}
                    className="w-full bg-green-600 text-white p-4 rounded-xl border-b-4 border-green-800 active:border-b-0 active:translate-y-1 font-black text-lg uppercase flex items-center justify-center gap-2 mb-4 animate-pulse"
                  >
                    <Download className="w-6 h-6" />
                    INSTALAR APLICATIVO
                  </button>
                )}

                {activeWorkday ? (
                    isDayOpen ? (
                        <>
                            <div className="bg-blue-50 border-4 border-blue-200 rounded-xl p-6 text-center">
                                <p className="text-gray-600 font-bold text-lg uppercase mb-1">Total de Hoje</p>
                                <p className="text-6xl font-black text-blue-900">{todayTotalBoxes}</p>
                                <p className="text-xl font-bold text-gray-500">caixas marcadas</p>
                            </div>

                            <Link to={`/day/${activeWorkday.id}/mark`} className="block">
                                <button className="w-full h-32 rounded-2xl bg-blue-700 active:bg-blue-800 text-white shadow-xl border-b-8 border-blue-900 flex flex-col items-center justify-center gap-2">
                                    <PlayCircle className="w-12 h-12" />
                                    <span className="text-3xl font-black uppercase">MARCAR CAIXAS</span>
                                </button>
                            </Link>
                            <p className="text-center text-gray-500 font-bold text-lg">Toque no botão azul para marcar</p>

                            <Link to={`/day/${activeWorkday.id}/summary`} className="block mt-4">
                                <button className="w-full h-20 rounded-xl bg-white border-4 border-gray-300 text-gray-700 font-black text-xl uppercase flex items-center justify-center gap-3 active:bg-gray-100">
                                    <ListTodo className="w-8 h-8" />
                                    FECHAR O DIA / RESUMO
                                </button>
                            </Link>
                        </>
                    ) : (
                        <div className="text-center space-y-6 pt-4">
                             <div className="bg-red-50 p-6 rounded-xl border-4 border-red-100">
                                <Lock className="w-12 h-12 text-red-600 mx-auto mb-2" />
                                <h2 className="text-2xl font-black text-red-800">DIA FECHADO</h2>
                                <p className="text-lg font-bold text-gray-600">O dia de hoje já foi finalizado.</p>
                             </div>
                             
                             <Link to={`/day/${activeWorkday.id}/summary`}>
                                <Button variant="secondary" size="xl" className="w-full mt-4">
                                    VER RESUMO DO DIA
                                </Button>
                             </Link>

                             <Link to="/day/new">
                                <Button variant="success" size="xl" className="w-full mt-4">
                                    INICIAR NOVO DIA
                                </Button>
                             </Link>
                        </div>
                    )
                ) : (
                     <div className="text-center space-y-6 pt-10">
                        <h2 className="text-3xl font-black text-gray-800">Olá, Turmeiro!</h2>
                        <p className="text-xl text-gray-600 font-medium px-4">Não há nenhum dia aberto. Vamos começar?</p>
                        
                        <Link to="/day/new" className="block">
                            <button className="w-full h-32 rounded-2xl bg-green-600 active:bg-green-700 text-white shadow-xl border-b-8 border-green-800 flex flex-col items-center justify-center gap-2 animate-bounce-slow">
                                <PlayCircle className="w-12 h-12" />
                                <span className="text-3xl font-black uppercase">INICIAR DIA</span>
                            </button>
                        </Link>
                    </div>
                )}

                <div className="border-t-2 border-gray-200 pt-6 mt-8">
                    <p className="text-center text-gray-400 font-bold uppercase mb-4">Outras Opções</p>
                    <div className="grid grid-cols-2 gap-4">
                         <Link to="/week" className="bg-gray-100 p-4 rounded-xl text-center font-bold text-gray-700 border-b-4 border-gray-300 active:border-b-0 active:translate-y-1">
                            <CalendarDays className="w-8 h-8 mx-auto mb-2" />
                            SEMANA
                         </Link>
                         <Link to="/settings" className="bg-gray-100 p-4 rounded-xl text-center font-bold text-gray-700 border-b-4 border-gray-300 active:border-b-0 active:translate-y-1">
                            <Settings2 className="w-8 h-8 mx-auto mb-2" />
                            AJUSTES
                         </Link>
                    </div>
                </div>
            </main>
        </div>
    );
  }

  // --- STANDARD DASHBOARD ---
  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <Header 
        title="Turmeiro App" 
        action={
            <button 
                onClick={toggleEasyMode} 
                className="flex items-center gap-2 bg-blue-800 hover:bg-blue-600 px-3 py-1.5 rounded-lg border border-blue-500 transition-colors shadow-sm"
            >
                <Accessibility className="w-4 h-4 text-blue-100" />
                <span className="text-xs font-bold text-white uppercase">Modo Fácil</span>
            </button>
        }
      />
      
      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* PWA INSTALL BANNER (Standard Mode) */}
        {installPrompt && (
           <div 
             onClick={handleInstallClick}
             className="bg-green-600 text-white p-4 rounded-xl shadow-lg border-b-4 border-green-800 cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-between"
           >
              <div className="flex items-center gap-3">
                 <div className="bg-white/20 p-2 rounded-lg">
                    <Download className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <h3 className="font-black text-lg">INSTALAR APLICATIVO</h3>
                    <p className="text-xs text-green-100 font-bold">Funciona offline sem internet</p>
                 </div>
              </div>
              <ArrowRight className="w-6 h-6 text-green-200" />
           </div>
        )}

        {/* ACTION HERO CARD */}
        {activeWorkday ? (
          <div className={`${isDayOpen ? 'bg-blue-900 border-blue-950' : 'bg-gray-800 border-gray-900'} rounded-xl p-6 text-white shadow-xl border-4 relative overflow-hidden`}>
            <div className={`absolute top-0 right-0 p-2 rounded-bl-xl border-b-2 border-l-2 ${isDayOpen ? 'bg-blue-800 border-blue-700' : 'bg-red-800 border-red-900'}`}>
                {isDayOpen ? (
                    <span className="text-xs font-black uppercase tracking-widest text-blue-200">DIA ABERTO</span>
                ) : (
                    <div className="flex items-center gap-1 text-red-100">
                        <Lock className="w-3 h-3" />
                        <span className="text-xs font-black uppercase tracking-widest">FECHADO</span>
                    </div>
                )}
            </div>
            
            <div className="mb-6">
              <p className={`${isDayOpen ? 'text-blue-300' : 'text-gray-400'} text-sm font-bold uppercase mb-1`}>Local Atual</p>
              <h2 className="text-3xl font-black leading-tight">{latestShift?.orchardNameSnapshot || 'Sem Pomar'}</h2>
              <div className={`mt-2 inline-block px-3 py-1 rounded text-lg font-bold border ${isDayOpen ? 'bg-blue-800 border-blue-600' : 'bg-gray-700 border-gray-600 text-gray-300'}`}>
                 {latestShift ? formatCurrency(latestShift.pricePerBox) : '-'} / cx
              </div>
            </div>

            <div className={`flex justify-between items-end border-t-2 pt-4 mb-5 ${isDayOpen ? 'border-blue-800' : 'border-gray-700'}`}>
               <div>
                 <p className={`text-sm font-bold uppercase ${isDayOpen ? 'text-blue-300' : 'text-gray-400'}`}>Total Hoje</p>
                 <p className="text-5xl font-black tracking-tighter">{todayTotalBoxes} <span className="text-xl font-medium opacity-70">cx</span></p>
               </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
                {isDayOpen ? (
                    <Link to={`/day/${activeWorkday.id}/mark`}>
                    <Button className="w-full bg-white text-blue-900 border-b-8 border-gray-300 hover:bg-gray-100 hover:border-gray-400 active:border-b-0 active:translate-y-2 transition-all" size="xl">
                        <PlayCircle className="mr-3 w-8 h-8" />
                        CONTINUAR
                    </Button>
                    </Link>
                ) : (
                    <div className="bg-red-900/50 p-3 rounded text-center border border-red-800 mb-2">
                        <p className="font-bold text-red-200">Dia finalizado.</p>
                    </div>
                )}
                
                <Link to={`/day/${activeWorkday.id}/summary`}>
                    <Button variant="outline" className={`w-full border-2 ${isDayOpen ? 'border-blue-400 text-blue-100 bg-blue-800/50 hover:bg-blue-800' : 'border-gray-500 text-gray-200 bg-gray-700 hover:bg-gray-600'}`}>
                        Ver Resumo / {isDayOpen ? 'Fechar' : 'Reabrir'}
                    </Button>
                </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-200 text-center space-y-4">
              <div className="flex justify-center mb-2">
                <div className="bg-green-100 p-4 rounded-full">
                    <CheckCircle2 className="w-10 h-10 text-green-700" />
                </div>
              </div>
              <div>
                  <h2 className="text-xl font-black text-gray-900">Tudo pronto!</h2>
                  <p className="text-gray-500 font-medium">Nenhum dia aberto no momento.</p>
              </div>
              <Link to="/day/new" className="block">
                <Button className="w-full text-xl shadow-lg" size="xl" variant="success">
                <PlayCircle className="mr-3 w-8 h-8" />
                INICIAR DIA
                </Button>
              </Link>
          </div>
        )}

        {/* QUICK NAVIGATION */}
        <div className="grid grid-cols-2 gap-4">
            <Link to="/week">
              <Card className="h-32 flex flex-col items-center justify-center bg-white active:bg-gray-50 border-b-4 border-gray-900 hover:bg-gray-50 transition-colors">
                <CalendarDays className="w-10 h-10 text-blue-800 mb-2" />
                <span className="font-black text-lg text-gray-900">SEMANA</span>
              </Card>
            </Link>

            <Link to="/settings">
              <Card className="h-32 flex flex-col items-center justify-center bg-white active:bg-gray-50 border-b-4 border-gray-900 hover:bg-gray-50 transition-colors">
                <Settings2 className="w-10 h-10 text-gray-700 mb-2" />
                <span className="font-black text-lg text-gray-900">AJUSTES</span>
              </Card>
            </Link>
        </div>

         <Link to="/backup">
             <Button variant="outline" className="w-full justify-between px-6 h-20 border-b-4">
               <div className="flex items-center">
                  <HardDriveDownload className="mr-4 w-8 h-8 text-gray-700" />
                  <div className="text-left">
                    <span className="block font-black text-lg">BACKUP / DADOS</span>
                    <span className="text-xs text-gray-500 font-bold">Salvar ou Restaurar</span>
                  </div>
               </div>
               <ArrowRight className="w-6 h-6 text-gray-400" />
             </Button>
          </Link>

      </main>
    </div>
  );
}