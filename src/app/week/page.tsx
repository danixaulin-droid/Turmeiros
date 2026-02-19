"use client";

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatCurrency } from '../../lib/utils';
import { startOfWeek, endOfWeek, subWeeks, addWeeks, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FileSaver from 'file-saver';
import { Download, ChevronLeft, ChevronRight, AlertCircle, CalendarDays, ChevronDown, ChevronUp, ExternalLink, Lock, CheckCircle2, Unlock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

// Types for data structure
interface DailyBreakdown {
  date: string;
  weekDay: string;
  boxes: number;
  value: number;
}

interface PickerAggregated {
  pickerId: string;
  name: string;
  nickname: string;
  totalBoxes: number;
  totalValue: number;
  dailyBreakdown: Record<string, DailyBreakdown>;
}

interface WeekSummaryData {
    dailySummaries: any[];
    pickersAggregated: PickerAggregated[];
    totalWeekBoxes: number;
    totalWeekValue: number;
    closedWorkdaysCount: number;
}

export default function WeekPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedPickers, setExpandedPickers] = useState<Record<string, boolean>>({});
  
  // Modals
  const [showCloseWeekModal, setShowCloseWeekModal] = useState(false);
  const [showReopenWeekModal, setShowReopenWeekModal] = useState(false);

  // --- DATE RANGES ---
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const startStr = format(weekStart, 'yyyy-MM-dd');
  const endStr = format(weekEnd, 'yyyy-MM-dd');
  const weekId = startStr; // ID for the week record

  // --- DATA FETCHING (LIVE) ---
  
  // 1. Week Record (Status)
  const weekRecord = useLiveQuery(() => db.weeks.get(weekId), [weekId]);
  const isWeekClosed = weekRecord?.status === 'closed';

  // 2. Workdays in range (ONLY CLOSED DAYS)
  const closedWorkdays = useLiveQuery(
    () => db.workdays
            .where('date').between(startStr, endStr, true, true)
            // Robust: consider closed if status === 'closed' OR closedAt exists
            .filter(w => w?.status === 'closed' || !!(w as any)?.closedAt)
            .toArray(),
    [startStr, endStr]
  );

  const sortedClosedWorkdays = useMemo(() => 
    (closedWorkdays || []).sort((a,b) => a.date.localeCompare(b.date)), 
  [closedWorkdays]);

  const closedWorkdayIds = useMemo(() => sortedClosedWorkdays.map(w => w.id), [sortedClosedWorkdays]);

  // Check for open days just for notification
  const openWorkdaysCount = useLiveQuery(
      () => db.workdays
            .where('date').between(startStr, endStr, true, true)
            .filter(w => w.status !== 'closed')
            .count(),
      [startStr, endStr]
  );

  // 3. Related Data
  const shifts = useLiveQuery(
    () => db.shifts.where('workdayId').anyOf(closedWorkdayIds).toArray(),
    [closedWorkdayIds]
  );

  const counts = useLiveQuery(
    () => db.counts.where('workdayId').anyOf(closedWorkdayIds).toArray(),
    [closedWorkdayIds]
  );
  
  const pickers = useLiveQuery(() => db.pickers.toArray());

  // --- CALCULATION LOGIC (LIVE) ---
  
  const liveData: WeekSummaryData = useMemo(() => {
    if (!sortedClosedWorkdays || !counts || !shifts || !pickers) {
        return { dailySummaries: [], pickersAggregated: [], totalWeekBoxes: 0, totalWeekValue: 0, closedWorkdaysCount: 0 };
    }

    // A. Daily Summaries
    const dailySummaries = sortedClosedWorkdays.map(day => {
        const dayCounts = counts.filter(c => c.workdayId === day.id);

        // Agrupa por pomar (se mudou de pomar no mesmo dia)
        const orchardMap = new Map<string, { orchardName: string; totalBoxes: number; totalValue: number }>();
        dayCounts.forEach(c => {
            if (!c.boxes || c.boxes <= 0) return;
            const shift = shifts.find(s => s.id === c.shiftId);
            if (!shift) return;
            const key = shift.orchardNameSnapshot || 'Sem Pomar';
            const cur = orchardMap.get(key) || { orchardName: key, totalBoxes: 0, totalValue: 0 };
            cur.totalBoxes += c.boxes;
            cur.totalValue += c.boxes * shift.pricePerBox;
            orchardMap.set(key, cur);
        });
        const orchards = Array.from(orchardMap.values()).sort((a,b) => b.totalBoxes - a.totalBoxes);
        let dayBoxes = 0;
        let dayValue = 0;
        dayCounts.forEach(c => {
            const shift = shifts.find(s => s.id === c.shiftId);
            if(shift) {
                dayBoxes += c.boxes;
                dayValue += c.boxes * shift.pricePerBox;
            }
        });
        const dateObj = new Date(day.date + 'T00:00:00');
        return {
            id: day.id,
            dateRaw: day.date,
            dateFormatted: format(dateObj, 'dd/MM/yyyy'),
            weekDay: format(dateObj, 'EEEE', { locale: ptBR }),
            totalBoxes: dayBoxes,
            totalValue: dayValue,
            orchards
        };
    });

    // B. Picker Aggregation
    const map = new Map<string, PickerAggregated>();
    counts.forEach(c => {
        const shift = shifts.find(s => s.id === c.shiftId);
        const workday = sortedClosedWorkdays.find(w => w.id === c.workdayId);
        if(!shift || !workday || c.boxes <= 0) return;

        const p = pickers.find(pk => pk.id === c.pickerId);
        const name = p?.name || 'Desconhecido';
        const nickname = p?.nickname || '';

        const current = map.get(c.pickerId) || { 
            pickerId: c.pickerId, name, nickname, totalBoxes: 0, totalValue: 0, dailyBreakdown: {}
        };
        const val = c.boxes * shift.pricePerBox;
        
        current.totalBoxes += c.boxes;
        current.totalValue += val;
        
        if (!current.dailyBreakdown[workday.date]) {
            current.dailyBreakdown[workday.date] = {
                date: workday.date,
                weekDay: format(new Date(workday.date + 'T00:00:00'), 'EEEE', { locale: ptBR }),
                boxes: 0,
                value: 0
            };
        }
        current.dailyBreakdown[workday.date].boxes += c.boxes;
        current.dailyBreakdown[workday.date].value += val;
        map.set(c.pickerId, current);
    });
    
    const pickersAggregated = Array.from(map.values()).sort((a,b) => b.totalBoxes - a.totalBoxes);
    const totalWeekBoxes = pickersAggregated.reduce((acc, curr) => acc + curr.totalBoxes, 0);
    const totalWeekValue = pickersAggregated.reduce((acc, curr) => acc + curr.totalValue, 0);

    return {
        dailySummaries,
        pickersAggregated,
        totalWeekBoxes,
        totalWeekValue,
        closedWorkdaysCount: sortedClosedWorkdays.length
    };
  }, [sortedClosedWorkdays, counts, shifts, pickers]);

  // --- DISPLAY DATA SOURCE ---
  // If week is closed and snapshot exists, use snapshot. Otherwise use live calculation.
  const displayData: WeekSummaryData = useMemo(() => {
    if (isWeekClosed && weekRecord?.snapshot) {
        return weekRecord.snapshot;
    }
    return liveData;
  }, [isWeekClosed, weekRecord, liveData]);


  // --- ACTIONS ---

  const handleCloseWeek = async () => {
    if (!liveData) return;
    
    try {
        await db.weeks.put({
            id: weekId,
            weekStart: startStr,
            weekEnd: endStr,
            status: 'closed',
            closedAt: Date.now(),
            snapshot: liveData, // Save the current state as snapshot
        });
        setShowCloseWeekModal(false);
    } catch (e) {
        console.error(e);
        alert('Erro ao fechar semana.');
    }
  };

  const handleReopenWeek = async () => {
    try {
        await db.weeks.update(weekId, {
            status: 'open',
            reopenedAt: Date.now()
        });
        setShowReopenWeekModal(false);
    } catch (e) {
        console.error(e);
        alert('Erro ao reabrir semana.');
    }
  };

  const togglePicker = (id: string) => {
    setExpandedPickers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const exportCSV = () => {
    let csvContent = "Data;Dia;Colhedor;Caixas;Valor\n";
    
    displayData.pickersAggregated.forEach(p => {
        const dates = Object.keys(p.dailyBreakdown).sort();
        dates.forEach(date => {
            const d = p.dailyBreakdown[date];
             csvContent += `${format(new Date(d.date+'T00:00:00'), 'dd/MM/yyyy')};${d.weekDay};${p.name};${d.boxes};${d.value.toFixed(2).replace('.',',')}\n`;
        });
    });

    csvContent += `\n;;TOTAL GERAL;${displayData.totalWeekBoxes};${displayData.totalWeekValue.toFixed(2).replace('.', ',')}\n`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    FileSaver.saveAs(blob, `resumo_semana_${isWeekClosed ? 'FECHADA_' : ''}${startStr}.csv`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Resumo Semanal" showBack />
      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* HEADER: DATE CONTROLS */}
        <div className={`p-3 rounded-xl shadow-sm border-4 ${isWeekClosed ? 'bg-red-50 border-red-200' : 'bg-white border-gray-900'}`}>
            <div className="flex justify-between items-center mb-2">
                <button onClick={() => setCurrentDate(d => subWeeks(d, 1))} className="p-2 hover:bg-gray-100 rounded text-blue-800">
                    <ChevronLeft className="w-8 h-8" />
                </button>
                <div className="text-center">
                    {isWeekClosed && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-black mb-1 inline-block">SEMANA FECHADA</span>}
                    <p className={`text-xs font-black uppercase tracking-wider ${isWeekClosed ? 'text-red-800' : 'text-gray-500'}`}>SEMANA (SEG - DOM)</p>
                    <p className="text-lg font-bold text-gray-900">
                        {format(weekStart, 'dd/MM')} a {format(weekEnd, 'dd/MM/yyyy')}
                    </p>
                </div>
                <button onClick={() => setCurrentDate(d => addWeeks(d, 1))} className="p-2 hover:bg-gray-100 rounded text-blue-800">
                    <ChevronRight className="w-8 h-8" />
                </button>
            </div>
            
            <div className="flex justify-between items-center text-xs px-2 pt-2 border-t border-gray-100">
                <span className={`px-2 py-0.5 rounded font-black uppercase ${isWeekClosed ? 'bg-red-100 text-red-900' : 'bg-green-100 text-green-900'}`}>
                    {displayData.closedWorkdaysCount} dias computados
                </span>
                <button onClick={exportCSV} className="text-blue-800 font-bold flex items-center gap-1 uppercase">
                    <Download className="w-4 h-4" /> Exportar CSV
                </button>
            </div>
        </div>

        {/* ALERT: OPEN DAYS (Only if week is open) */}
        {!isWeekClosed && openWorkdaysCount && openWorkdaysCount > 0 ? (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-3 flex gap-3 items-center">
                <AlertCircle className="w-6 h-6 text-yellow-700" />
                <div className="text-sm font-bold text-yellow-900 flex-1">
                    Há {openWorkdaysCount} dia(s) em aberto. Feche os dias para fechar a semana.
                </div>
            </div>
        ) : null}

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-1 gap-3">
             {isWeekClosed ? (
                <div className="bg-white p-4 rounded-xl border-2 border-red-100 shadow-sm text-center space-y-3">
                    <div className="flex items-center justify-center gap-2 text-red-700 font-bold">
                        <Lock className="w-5 h-5" />
                        <span>RELATÓRIO FINAL CONGELADO</span>
                    </div>
                    <p className="text-xs text-gray-500">Fechado em {weekRecord?.closedAt ? format(new Date(weekRecord.closedAt), 'dd/MM HH:mm') : '-'}</p>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => setShowReopenWeekModal(true)}
                    >
                        <Unlock className="w-4 h-4 mr-2" />
                        Reabrir Semana (Correção)
                    </Button>
                </div>
             ) : (
                displayData.totalWeekBoxes > 0 && (
                    <Button 
                        onClick={() => setShowCloseWeekModal(true)} 
                        className="w-full bg-gray-900 border-gray-950 text-white" 
                        size="lg"
                    >
                        <CheckCircle2 className="w-6 h-6 mr-2 text-green-400" />
                        FECHAR SEMANA
                    </Button>
                )
             )}
        </div>

        {/* SECTION A: DAYS OF THE WEEK */}
        <div className="space-y-2">
            <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide ml-1 flex gap-2 items-center">
                <CalendarDays className="w-4 h-4" /> Dias da Semana
            </h3>
            
            <div className="space-y-3">
                {displayData.dailySummaries.map((day: any) => (
                    <Card key={day.id} className={isWeekClosed ? 'opacity-90 bg-gray-50' : ''}>
                        {isWeekClosed ? (
                            <div className="p-3 flex justify-between items-center cursor-default">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-gray-700 text-lg capitalize">{day.weekDay}</span>
                                        <span className="text-sm text-gray-500 font-bold">{day.dateFormatted}</span>
                                    </div>
                                    <div className="flex gap-3 text-xs mt-1">
                                        <span className="bg-gray-200 text-gray-700 px-2 rounded font-bold">Total: {day.totalBoxes} cx</span>
                                    </div>

                                    {day.orchards?.length ? (
                                      <div className="flex flex-wrap gap-2 text-xs mt-2">
                                        {day.orchards.map((o) => (
                                          <span
                                            key={o.orchardName}
                                            className="bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded font-bold"
                                          >
                                            {o.orchardName}: {o.totalBoxes} cx
                                          </span>
                                        ))}
                                      </div>
                                    ) : null}
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <span className="font-bold text-green-700">{formatCurrency(day.totalValue)}</span>
                                </div>
                            </div>
                        ) : (
                            <Link href={`/day/${day.id}/summary`} className="block active:bg-gray-50">
                                <div className="p-3 flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-gray-900 text-lg capitalize">{day.weekDay}</span>
                                            <span className="text-sm text-gray-500 font-bold">{day.dateFormatted}</span>
                                        </div>
                                        <div className="flex gap-3 text-xs mt-1">
                                            <span className="bg-blue-100 text-blue-900 px-2 rounded font-bold">Total: {day.totalBoxes} cx</span>
                                        </div>

                                    {day.orchards?.length ? (
                                      <div className="flex flex-wrap gap-2 text-xs mt-2">
                                        {day.orchards.map((o) => (
                                          <span
                                            key={o.orchardName}
                                            className="bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded font-bold"
                                          >
                                            {o.orchardName}: {o.totalBoxes} cx
                                          </span>
                                        ))}
                                      </div>
                                    ) : null}
                                    </div>
                                    <div className="text-right flex items-center gap-2">
                                        <span className="font-bold text-green-700">{formatCurrency(day.totalValue)}</span>
                                        <ExternalLink className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            </Link>
                        )}
                    </Card>
                ))}
                {displayData.dailySummaries.length === 0 && (
                    <div className="p-4 text-center text-gray-500 bg-white rounded-xl border-2 border-dashed border-gray-300 font-bold">
                        Nenhum dia fechado nesta semana.
                    </div>
                )}
            </div>
        </div>

        {/* SECTION B: PICKER LIST (ACCORDION) */}
        <div className="space-y-2 pt-4">
            <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide ml-1 flex justify-between items-center">
                <span>Resumo por Colhedor</span>
                <span className="text-[10px] text-gray-400">Toque para detalhes</span>
            </h3>
            
            <div className="space-y-3">
                {displayData.pickersAggregated.map(picker => {
                    const isExpanded = expandedPickers[picker.pickerId];
                    // Sort days for this picker
                    const days = (Object.values(picker.dailyBreakdown) as DailyBreakdown[]).sort((a,b) => a.date.localeCompare(b.date));

                    return (
                        <div key={picker.pickerId} className="bg-white rounded-xl border-2 border-gray-900 shadow-sm overflow-hidden transition-all">
                            {/* Accordion Header */}
                            <div 
                                onClick={() => togglePicker(picker.pickerId)}
                                className={`p-4 flex justify-between items-center cursor-pointer select-none ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${isExpanded ? 'bg-blue-600 text-white border-blue-800' : 'bg-gray-200 text-gray-600 border-gray-300'}`}>
                                        {picker.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 text-lg leading-none">{picker.name}</p>
                                        {picker.nickname && <p className="text-xs font-bold text-gray-500 mt-1">"{picker.nickname}"</p>}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="font-black text-2xl text-gray-900">{picker.totalBoxes} <span className="text-xs font-bold text-gray-400">cx</span></p>
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-6 h-6 text-blue-600" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
                                </div>
                            </div>

                            {/* Accordion Content */}
                            {isExpanded && (
                                <div className="border-t-2 border-gray-200 bg-white animate-in slide-in-from-top-2">
                                    {/* Total Value Banner */}
                                    <div className="bg-green-700 text-white p-3 flex justify-between items-center">
                                        <span className="text-xs font-black uppercase opacity-80">A Receber (Semana)</span>
                                        <span className="text-xl font-black">{formatCurrency(picker.totalValue)}</span>
                                    </div>

                                    {/* Detailed List by Day */}
                                    <div className="p-3 space-y-2">
                                        <p className="text-[10px] text-gray-400 uppercase font-black pl-1">Produção Diária</p>
                                        {days.map((day, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-900 font-bold capitalize">{day.weekDay}</span>
                                                        <span className="text-xs text-gray-500 font-bold">{format(new Date(day.date+'T00:00:00'), 'dd/MM')}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-black text-lg text-gray-800">{day.boxes} cx</div>
                                                    <div className="text-xs text-green-700 font-bold">{formatCurrency(day.value)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Grand Total Footer */}
        {displayData.pickersAggregated.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white border-t-4 border-gray-700 p-3 shadow-2xl z-20 pb-safe">
                <div className="max-w-md mx-auto flex justify-between items-center">
                    <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">TOTAL SEMANA</p>
                        <p className="text-2xl font-black">{displayData.totalWeekBoxes} <span className="text-sm font-bold text-gray-500">cx</span></p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">VALOR TOTAL</p>
                        <p className="text-2xl font-black text-green-400">{formatCurrency(displayData.totalWeekValue)}</p>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL: CLOSE WEEK */}
        {showCloseWeekModal && (
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] border-4 border-gray-900">
                     <div className="bg-gray-900 p-4 text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="w-8 h-8 text-green-400" />
                            <h3 className="font-black text-xl uppercase">Fechar Semana</h3>
                        </div>
                        <p className="text-gray-300 text-sm">
                            Confirme os totais. Isso bloqueará edições e salvará este relatório.
                        </p>
                    </div>

                    <div className="p-4 overflow-y-auto grow">
                         <div className="text-center mb-4 border-b pb-4">
                            <p className="text-xs text-gray-500 font-black uppercase">PERÍODO</p>
                            <h2 className="font-bold text-lg">{format(weekStart, 'dd/MM')} a {format(weekEnd, 'dd/MM/yyyy')}</h2>
                        </div>

                        <div className="bg-gray-100 p-4 rounded-lg space-y-2 border-2 border-gray-200 mb-4">
                            <div className="flex justify-between text-lg">
                                <span className="text-gray-800 font-bold">Total Geral:</span>
                                <span className="font-black">{displayData.totalWeekBoxes} cx</span>
                            </div>
                            <div className="flex justify-between text-xl border-t-2 border-gray-300 pt-2">
                                <span className="text-gray-800 font-bold">Valor Total:</span>
                                <span className="font-black text-green-700">{formatCurrency(displayData.totalWeekValue)}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-black text-gray-500 uppercase">Resumo ({displayData.pickersAggregated.length} colhedores)</p>
                            {displayData.pickersAggregated.slice(0, 5).map(p => (
                                <div key={p.pickerId} className="flex justify-between text-sm">
                                    <span className="font-bold text-gray-700 truncate max-w-[150px]">{p.name}</span>
                                    <span className="font-bold">{p.totalBoxes} cx</span>
                                </div>
                            ))}
                            {displayData.pickersAggregated.length > 5 && (
                                <p className="text-xs text-center text-gray-400 italic">...e mais {displayData.pickersAggregated.length - 5}</p>
                            )}
                        </div>
                    </div>

                    <div className="p-4 border-t-2 border-gray-200 shrink-0 flex gap-3">
                        <Button variant="outline" onClick={() => setShowCloseWeekModal(false)} className="flex-1">
                            Cancelar
                        </Button>
                        <Button variant="success" onClick={handleCloseWeek} className="flex-1">
                            CONFIRMAR
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL: REOPEN WEEK */}
        {showReopenWeekModal && (
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border-4 border-red-500">
                     <div className="bg-red-100 p-4 text-red-900">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="font-black text-lg uppercase">Reabrir Semana?</h3>
                        </div>
                        <p className="text-sm font-bold">
                            Cuidado: O relatório congelado será descartado. Os valores serão recalculados com base nos dias atuais.
                        </p>
                    </div>
                    <div className="p-4 flex gap-3">
                        <Button variant="outline" onClick={() => setShowReopenWeekModal(false)} className="flex-1">
                            Cancelar
                        </Button>
                        <Button variant="danger" onClick={handleReopenWeek} className="flex-1">
                            REABRIR
                        </Button>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}