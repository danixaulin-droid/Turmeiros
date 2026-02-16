import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../../lib/db';
import { Header } from '../../../../components/layout/Header';
import { Button } from '../../../../components/ui/Button';
import { formatCurrency, generateUUID } from '../../../../lib/utils';
import { Search, ArrowUpDown, ListTodo, RefreshCw, X, Check, Lock, LayoutGrid, List as ListIcon, Trash2, ArrowLeft } from 'lucide-react';
import { useSettings } from '../../../../lib/SettingsContext';

export default function MarkPage() {
  const { id: workdayId } = useParams();
  const { isEasyMode } = useSettings();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'boxes'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(isEasyMode ? 'list' : 'grid');
  
  // Force List view if Easy Mode
  if (isEasyMode && viewMode !== 'list') setViewMode('list');
  
  // Modals State
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [newOrchardId, setNewOrchardId] = useState('');
  const [newPrice, setNewPrice] = useState('');

  // Data Fetching
  const workday = useLiveQuery(() => workdayId ? db.workdays.get(workdayId) : undefined, [workdayId]);
  const orchards = useLiveQuery(() => db.orchards.orderBy('name').filter(o => o.active).toArray());
  const shifts = useLiveQuery(() => workdayId ? db.shifts.where('workdayId').equals(workdayId).toArray() : [], [workdayId]);
  const pickers = useLiveQuery(() => db.pickers.toArray());
  
  // Derived State
  const activeShift = useMemo(() => {
    if(!shifts || shifts.length === 0) return null;
    return shifts.sort((a,b) => b.createdAt - a.createdAt)[0]; 
  }, [shifts]);

  const shiftNumber = useMemo(() => {
    if(!shifts || !activeShift) return 1;
    const sorted = [...shifts].sort((a,b) => a.createdAt - b.createdAt);
    return sorted.findIndex(s => s.id === activeShift.id) + 1;
  }, [shifts, activeShift]);

  const isClosed = workday?.status === 'closed';

  const activeShiftCounts = useLiveQuery(() => 
    activeShift ? db.counts.where('shiftId').equals(activeShift.id).toArray() : [], 
  [activeShift]);

  // Combine Counts with Picker Info
  const pickerCards = useMemo(() => {
    if (!activeShift || !activeShiftCounts || !pickers) return [];

    return activeShiftCounts.map(count => {
      const picker = pickers.find(p => p.id === count.pickerId);
      return {
        ...count,
        pickerName: picker?.name || 'Desconhecido',
        pickerNickname: picker?.nickname || '',
      };
    }).filter(item => {
        const term = search.toLowerCase();
        return item.pickerName.toLowerCase().includes(term) || item.pickerNickname.toLowerCase().includes(term);
    }).sort((a, b) => {
        if (sortBy === 'boxes') {
            if (b.boxes !== a.boxes) return b.boxes - a.boxes;
            return a.pickerName.localeCompare(b.pickerName);
        }
        return a.pickerName.localeCompare(b.pickerName);
    });
  }, [activeShift, activeShiftCounts, pickers, search, sortBy]);

  const shiftTotalBoxes = useMemo(() => activeShiftCounts?.reduce((sum, c) => sum + c.boxes, 0) || 0, [activeShiftCounts]);
  const shiftTotalValue = (activeShift?.pricePerBox || 0) * shiftTotalBoxes;

  // --- ACTIONS ---

  const updateCount = async (countId: string, delta: number) => {
    if (isClosed) return;
    
    // Safety check for negative values in Easy Mode
    if (delta < 0 && isEasyMode) {
         const current = activeShiftCounts?.find(c => c.id === countId);
         if (!current || current.boxes <= 0) return;
         // Require confirmation for reset in easy mode if button logic changes, but for -1 usually safe.
         // Let's vibrate strongly for minus
    }

    try {
        await db.counts.where('id').equals(countId).modify(count => {
            count.boxes = Math.max(0, count.boxes + delta);
            count.updatedAt = Date.now();
        });
        
        if (navigator.vibrate) {
            if (delta > 0) navigator.vibrate(50); // Single bump for add
            else navigator.vibrate([30, 30]); // Double bump for subtract
        }
    } catch (e) {
        console.error("Update failed", e);
    }
  };

  const resetCount = async (countId: string) => {
    if (isClosed) return;
    if(confirm('Tem certeza que deseja ZERAR (apagar) todas as caixas deste colhedor?')) {
        await db.counts.update(countId, { boxes: 0, updatedAt: Date.now() });
    }
  };

  const handleCreateShift = async () => {
    if (!workdayId || !workday) return;
    if (!newOrchardId) return alert('Selecione um pomar');
    if (!newPrice || Number(newPrice) <= 0) return alert('Preço inválido');

    const orchard = orchards?.find(o => o.id === newOrchardId);
    if (!orchard) return;

    try {
        const shiftId = generateUUID();
        // 1. Create Shift
        await db.shifts.add({
            id: shiftId,
            workdayId,
            orchardId: newOrchardId,
            orchardNameSnapshot: orchard.name,
            pricePerBox: Number(newPrice),
            createdAt: Date.now()
        });
        
        // 2. Initialize Counts for ALL pickers in workday
        const countPromises = workday.pickerIds.map(pickerId => ({
            id: generateUUID(),
            workdayId,
            shiftId,
            pickerId,
            boxes: 0,
            updatedAt: Date.now()
        }));
        await db.counts.bulkAdd(countPromises);
        
        setShowShiftModal(false);
        setNewOrchardId('');
        setNewPrice('');
        
        // Auto scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
        console.error(err);
        alert('Erro ao criar turno.');
    }
  };

  if (!workday || !activeShift) return <div className="p-10 text-center font-bold text-lg">Carregando dados...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {isEasyMode ? (
         <div className="bg-blue-800 text-white p-3 flex justify-between items-center shadow-lg shrink-0">
             <Link to="/" className="flex items-center gap-2 p-2 bg-blue-900 rounded-lg border border-blue-600">
                 <ArrowLeft className="w-8 h-8" />
                 <span className="font-bold uppercase text-sm">Voltar</span>
             </Link>
             <h1 className="text-xl font-black uppercase">Marcar Caixas</h1>
             <Link to={`/day/${workdayId}/summary`} className="flex flex-col items-center bg-blue-900 p-2 rounded-lg border border-blue-600">
                 <ListTodo className="w-6 h-6" />
                 <span className="text-[10px] font-bold uppercase">Resumo</span>
             </Link>
         </div>
      ) : (
        <Header 
            title={isClosed ? "Dia Fechado" : "Marcação"} 
            showBack 
            action={
                <Link to={`/day/${workdayId}/summary`} className="text-white hover:text-blue-200 p-2">
                    <ListTodo className="w-7 h-7" />
                </Link>
            }
        />
      )}
      
      {/* SHIFT INFO BAR */}
      {isClosed ? (
        <div className="bg-red-700 text-white px-4 py-3 flex justify-center items-center font-black shadow-md z-30 border-b-4 border-red-900">
            <Lock className="w-6 h-6 mr-2" />
            VISUALIZAÇÃO APENAS
        </div>
      ) : (
        <div className={`${isEasyMode ? 'bg-white text-gray-900 border-b-4 border-gray-300 py-4' : 'bg-blue-900 text-white py-3 border-b-4 border-blue-950'} px-3 flex justify-between items-center shadow-lg z-30`}>
            <div>
                <div className="flex items-center gap-2">
                    <span className="bg-yellow-400 text-black text-xs px-2 py-0.5 rounded font-black uppercase tracking-wide border border-black">
                        {isEasyMode ? 'LOCAL ATUAL' : `TURNO ${shiftNumber}`}
                    </span>
                    <span className={`font-black ${isEasyMode ? 'text-2xl' : 'text-lg'} truncate max-w-[200px]`}>{activeShift.orchardNameSnapshot}</span>
                </div>
                <div className={`${isEasyMode ? 'text-gray-600' : 'text-blue-200'} text-xs font-bold mt-0.5 uppercase`}>
                    Preço: {formatCurrency(activeShift.pricePerBox)} / caixa
                </div>
            </div>
            <Button 
                size="sm" 
                variant="outline" 
                className={`h-12 text-xs border-2 ${isEasyMode ? 'border-blue-800 text-blue-800 bg-white' : 'border-white bg-blue-800 text-white'}`}
                onClick={() => setShowShiftModal(true)}
            >
                <RefreshCw className="w-5 h-5 mr-1.5" />
                TROCAR LOCAL
            </Button>
        </div>
      )}

      {/* FILTER CONTROLS */}
      {!isEasyMode && (
        <div className="px-3 py-3 bg-white border-b-2 border-gray-300 shadow-sm flex gap-2 sticky top-[120px] z-40">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-900 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-900 rounded-lg bg-gray-50 focus:bg-white focus:ring-4 focus:ring-blue-300 font-bold text-gray-900"
                />
            </div>
            <button 
                onClick={() => setSortBy(prev => prev === 'name' ? 'boxes' : 'name')}
                className="p-3 border-2 border-gray-900 rounded-lg bg-white active:bg-gray-100 min-w-[50px] flex items-center justify-center"
            >
                <ArrowUpDown className="w-6 h-6 text-gray-900" />
            </button>
            <button 
                onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
                className="p-3 border-2 border-gray-900 rounded-lg bg-white active:bg-gray-100 min-w-[50px] flex items-center justify-center"
            >
                {viewMode === 'grid' ? <ListIcon className="w-6 h-6 text-gray-900" /> : <LayoutGrid className="w-6 h-6 text-gray-900" />}
            </button>
        </div>
      )}

      {/* PICKERS GRID/LIST */}
      <div className={`flex-1 overflow-y-auto p-3 pb-56 space-y-4 ${viewMode === 'grid' && !isEasyMode ? 'grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0' : ''}`}>
        {isEasyMode && (
             <div className="text-center bg-blue-50 p-2 rounded border border-blue-200 text-blue-800 font-bold text-sm mb-2">
                Toque nos botões para somar caixas
             </div>
        )}
        
        {pickerCards.map(card => (
            <div 
                key={card.id} 
                className={`
                    bg-white rounded-xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] 
                    flex flex-col relative h-auto
                    ${isClosed ? 'opacity-80 bg-gray-100' : ''}
                    ${isEasyMode ? 'mb-6 border-b-8' : ''}
                `}
            >
                {/* Header */}
                <div className={`p-3 bg-gray-50 border-b-2 border-gray-900 flex justify-between items-center rounded-t-[10px] shrink-0 ${isEasyMode ? 'py-4' : ''}`}>
                    <div className="overflow-hidden">
                        <h3 className={`font-black text-gray-900 truncate leading-tight ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>{card.pickerName}</h3>
                        {card.pickerNickname && <p className="text-gray-600 font-bold text-sm truncate">"{card.pickerNickname}"</p>}
                    </div>
                    <div className="text-right min-w-[80px]">
                        <span className={`block font-black text-blue-900 leading-none ${isEasyMode ? 'text-5xl' : 'text-4xl'}`}>{card.boxes}</span>
                    </div>
                </div>

                {/* Actions Body */}
                {!isClosed && (
                    <div className="p-3 flex flex-col gap-3">
                        {isEasyMode ? (
                             // EASY MODE BUTTONS (Simplified)
                             <div className="space-y-3">
                                <div className="flex gap-2 h-24">
                                    <button 
                                        onClick={() => updateCount(card.id, 1)}
                                        className="flex-1 bg-blue-600 active:bg-blue-700 text-white font-black text-4xl rounded-xl border-b-8 border-blue-900 shadow-md active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-2"
                                    >
                                        +1 <span className="text-lg font-bold opacity-70">CAIXA</span>
                                    </button>
                                </div>
                                <div className="flex gap-2 h-16">
                                     <button 
                                        onClick={() => updateCount(card.id, 5)}
                                        className="w-1/3 bg-orange-500 active:bg-orange-600 text-white font-black text-2xl rounded-xl border-b-4 border-orange-800 shadow-sm active:border-b-0 active:translate-y-1 transition-all"
                                    >
                                        +5
                                    </button>
                                     <button 
                                        onClick={() => updateCount(card.id, -1)}
                                        disabled={card.boxes === 0}
                                        className="flex-1 bg-white border-4 border-red-200 text-red-600 font-bold text-xl rounded-xl disabled:opacity-30 active:bg-red-50 flex items-center justify-center"
                                     >
                                        -1 (Corrigir)
                                     </button>
                                      {card.boxes > 0 && (
                                         <button 
                                            onClick={() => resetCount(card.id)}
                                            className="w-14 bg-gray-200 border-2 border-gray-400 text-gray-600 rounded-xl flex items-center justify-center"
                                         >
                                            <Trash2 className="w-6 h-6" />
                                         </button>
                                     )}
                                </div>
                             </div>
                        ) : (
                            // STANDARD MODE BUTTONS
                            <>
                                <div className="grid grid-cols-3 gap-2">
                                    <button 
                                        onClick={() => updateCount(card.id, 1)}
                                        className="h-14 bg-blue-600 hover:bg-blue-700 active:translate-y-1 active:shadow-none text-white font-black text-2xl rounded-lg border-b-4 border-blue-900 shadow-sm transition-all"
                                    >
                                        +1
                                    </button>
                                    <button 
                                        onClick={() => updateCount(card.id, 5)}
                                        className="h-14 bg-orange-500 hover:bg-orange-600 active:translate-y-1 active:shadow-none text-white font-black text-2xl rounded-lg border-b-4 border-orange-800 shadow-sm transition-all"
                                    >
                                        +5
                                    </button>
                                    <button 
                                        onClick={() => updateCount(card.id, 10)}
                                        className="h-14 bg-green-600 hover:bg-green-700 active:translate-y-1 active:shadow-none text-white font-black text-2xl rounded-lg border-b-4 border-green-900 shadow-sm transition-all"
                                    >
                                        +10
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => updateCount(card.id, -1)}
                                        disabled={card.boxes === 0}
                                        className="h-12 bg-white border-2 border-red-700 text-red-700 font-bold rounded-lg disabled:opacity-30 active:bg-red-50 text-lg"
                                    >
                                        -1
                                    </button>

                                    {card.boxes > 0 ? (
                                        <button 
                                            onClick={() => resetCount(card.id)}
                                            className="h-12 flex items-center justify-center text-gray-500 hover:text-red-600 font-bold text-xs uppercase bg-gray-50 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Zerar
                                        </button>
                                    ) : (
                                        <div className="h-12"></div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        ))}
        
        {pickerCards.length === 0 && (
            <div className="text-center p-8 text-gray-500 font-medium">Nenhum colhedor encontrado.</div>
        )}
      </div>

      {/* FOOTER TOTALS */}
      <div className={`fixed bottom-0 left-0 right-0 ${isEasyMode ? 'bg-white border-t-4 border-blue-900 pb-safe' : 'bg-gray-900 border-t-4 border-gray-700 pb-safe bottom-20'} p-3 shadow-2xl z-40`}>
        <div className="max-w-md mx-auto flex justify-between items-center">
            <div>
                <p className={`${isEasyMode ? 'text-gray-500' : 'text-gray-400'} text-[10px] font-black uppercase tracking-wider`}>TOTAL DO LOCAL</p>
                <p className={`${isEasyMode ? 'text-gray-900' : 'text-white'} text-3xl font-black leading-none`}>{shiftTotalBoxes} <span className="text-sm font-bold opacity-50">cx</span></p>
            </div>
            <div className="text-right">
                <p className={`${isEasyMode ? 'text-gray-500' : 'text-gray-400'} text-[10px] font-black uppercase tracking-wider`}>VALOR A PAGAR</p>
                <p className={`text-3xl font-black ${isEasyMode ? 'text-green-700' : 'text-green-400'} leading-none`}>{formatCurrency(shiftTotalValue)}</p>
            </div>
        </div>
      </div>

      {/* NEW SHIFT MODAL */}
      {showShiftModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border-4 border-gray-900">
                <div className="bg-blue-900 p-4 text-white flex justify-between items-center">
                    <h3 className="font-black text-xl uppercase">Trocar Local</h3>
                    <button onClick={() => setShowShiftModal(false)} className="text-white hover:bg-white/20 rounded p-1"><X className="w-8 h-8" /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="bg-yellow-100 text-yellow-900 font-bold text-sm p-4 rounded border-2 border-yellow-500">
                        Isso cria um <strong>novo local de contagem</strong>. As caixas do local anterior ficam salvas.
                    </div>
                    <div>
                        <label className="block text-base font-black text-gray-900 mb-2">NOVO POMAR (LOCAL)</label>
                        <select value={newOrchardId} onChange={e => setNewOrchardId(e.target.value)} className="w-full p-4 border-2 border-gray-900 rounded-lg bg-white text-lg font-bold text-black h-16">
                            <option value="">Selecione...</option>
                            {orchards?.map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-base font-black text-gray-900 mb-2">NOVO PREÇO (R$)</label>
                        <input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="w-full p-4 border-2 border-gray-900 rounded-lg bg-white text-2xl font-black text-black" inputMode="decimal" />
                    </div>
                    <div className="pt-2 flex gap-3">
                         <Button variant="outline" size="lg" onClick={() => setShowShiftModal(false)} className="flex-1">CANCELAR</Button>
                         <Button size="lg" onClick={handleCreateShift} className="flex-1">CRIAR</Button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}