import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../../lib/db';
import { Header } from '../../../../components/layout/Header';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { formatCurrency } from '../../../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FileSaver from 'file-saver';
import { Download, Check, Lock, AlertTriangle, ArrowLeft, ChevronDown, ChevronUp, CalendarDays, Unlock } from 'lucide-react';

export default function DaySummaryPage() {
  const { id: workdayId } = useParams();
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [expandedShifts, setExpandedShifts] = useState<Record<string, boolean>>({});
  
  const workday = useLiveQuery(() => workdayId ? db.workdays.get(workdayId) : undefined, [workdayId]);
  const shifts = useLiveQuery(() => workdayId ? db.shifts.where('workdayId').equals(workdayId).toArray() : [], [workdayId]);
  const allCounts = useLiveQuery(() => workdayId ? db.counts.where('workdayId').equals(workdayId).toArray() : [], [workdayId]);
  const pickers = useLiveQuery(() => db.pickers.toArray());

  const isClosed = workday?.status === 'closed';

  // --- 1. PREPARE DATA PER SHIFT ---
  const shiftsData = useMemo(() => {
    if (!shifts || !allCounts || !pickers) return [];
    
    // Sort shifts by creation time
    const sortedShifts = [...shifts].sort((a,b) => a.createdAt - b.createdAt);

    return sortedShifts.map((shift, index) => {
        const shiftCounts = allCounts.filter(c => c.shiftId === shift.id);
        
        const rows = shiftCounts.map(c => {
            const picker = pickers.find(p => p.id === c.pickerId);
            return {
                pickerId: c.pickerId,
                name: picker?.name || 'Desconhecido',
                boxes: c.boxes,
                value: c.boxes * shift.pricePerBox
            };
        }).filter(r => r.boxes > 0).sort((a,b) => b.boxes - a.boxes);

        const totalBoxes = rows.reduce((sum, r) => sum + r.boxes, 0);
        const totalValue = rows.reduce((sum, r) => sum + r.value, 0);

        return {
            shiftNumber: index + 1,
            ...shift,
            rows,
            totalBoxes,
            totalValue
        };
    });
  }, [shifts, allCounts, pickers]);

  // --- 2. PREPARE TOTAL DAY DATA (AGGREGATED) ---
  const dayTotals = useMemo(() => {
    if (!shiftsData) return { rows: [], totalBoxes: 0, totalValue: 0 };

    const pickerMap = new Map<string, { name: string, boxes: number, value: number }>();

    shiftsData.forEach(shiftData => {
        shiftData.rows.forEach(row => {
            const current = pickerMap.get(row.pickerId) || { name: row.name, boxes: 0, value: 0 };
            current.boxes += row.boxes;
            current.value += row.value; // Already calculated with shift specific price
            pickerMap.set(row.pickerId, current);
        });
    });

    const rows = Array.from(pickerMap.values()).sort((a,b) => b.value - a.value);
    const totalBoxes = rows.reduce((sum, r) => sum + r.boxes, 0);
    const totalValue = rows.reduce((sum, r) => sum + r.value, 0);

    return { rows, totalBoxes, totalValue };
  }, [shiftsData]);

  const toggleShift = (shiftId: string) => {
    setExpandedShifts(prev => ({ ...prev, [shiftId]: !prev[shiftId] }));
  };

  const handleCloseDay = async () => {
    if (workdayId) {
        await db.workdays.update(workdayId, { status: 'closed', closedAt: Date.now() });
        setShowCloseModal(false);
    }
  };

  const handleReopenDay = async () => {
    if (workdayId) {
        await db.workdays.update(workdayId, { status: 'open', reopenedAt: Date.now() });
        setShowReopenModal(false);
    }
  };

  const exportCSV = () => {
    if(!workday || !shiftsData) return;
    
    // Header
    let csvContent = "Data;Dia_Semana;Turno;Pomar;Preco_Cx;Colhedor;Caixas;Valor_Total\n";
    
    const dateStr = format(new Date(workday.date + 'T00:00:00'), 'dd/MM/yyyy');
    const weekDay = format(new Date(workday.date + 'T00:00:00'), 'EEEE', { locale: ptBR });

    // Detailed rows per shift
    shiftsData.forEach(shift => {
        shift.rows.forEach(row => {
            csvContent += `${dateStr};${weekDay};${shift.shiftNumber};${shift.orchardNameSnapshot};${shift.pricePerBox.toFixed(2).replace('.', ',')};${row.name};${row.boxes};${row.value.toFixed(2).replace('.', ',')}\n`;
        });
    });

    // Spacer
    csvContent += "\n;;;;;TOTAL DIA;;\n";
    
    // Aggregated rows
    dayTotals.rows.forEach(row => {
        csvContent += `;;;;;${row.name};${row.boxes};${row.value.toFixed(2).replace('.', ',')}\n`;
    });
    
    // Grand Total
    csvContent += `;;;;;TOTAL GERAL;${dayTotals.totalBoxes};${dayTotals.totalValue.toFixed(2).replace('.', ',')}\n`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    FileSaver.saveAs(blob, `relatorio_dia_${workday.date}.csv`);
  };

  if(!workday) return <div className="p-4">Carregando...</div>;

  const dateDisplay = format(new Date(workday.date + 'T00:00:00'), 'dd/MM/yyyy');
  const weekDayDisplay = format(new Date(workday.date + 'T00:00:00'), 'EEEE', { locale: ptBR });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Resumo e Fechamento" showBack />
      
      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* HEADER INFO */}
        <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">{dateDisplay}</h2>
            <p className="text-lg capitalize text-gray-500">{weekDayDisplay}</p>
            {isClosed && (
                <div className="mt-2 inline-flex items-center bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold border border-red-200">
                    <Lock className="w-4 h-4 mr-1.5" />
                    DIA FECHADO
                </div>
            )}
        </div>

        {/* SECTION 1: PER SHIFT DETAILS */}
        <div className="space-y-3">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide border-b pb-1">
                1. Detalhes por Turno
            </h3>
            
            {shiftsData.map(shift => (
                <div key={shift.id} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                    <div 
                        className="p-3 bg-gray-50 flex justify-between items-center cursor-pointer select-none"
                        onClick={() => toggleShift(shift.id)}
                    >
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                                    #{shift.shiftNumber}
                                </span>
                                <span className="font-semibold text-gray-800">{shift.orchardNameSnapshot}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                                {formatCurrency(shift.pricePerBox)} / caixa
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="font-bold text-gray-900">{shift.totalBoxes} cx</div>
                             <div className="text-xs text-green-700 font-medium">{formatCurrency(shift.totalValue)}</div>
                        </div>
                        {expandedShifts[shift.id] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                    
                    {/* Collapsible List */}
                    {expandedShifts[shift.id] && (
                        <div className="border-t divide-y divide-gray-100">
                            {shift.rows.map(row => (
                                <div key={row.pickerId} className="flex justify-between p-2 text-sm px-4">
                                    <span className="text-gray-700">{row.name}</span>
                                    <div className="text-right flex gap-3">
                                        <span className="font-bold">{row.boxes}</span>
                                        <span className="w-20 text-gray-500">{formatCurrency(row.value)}</span>
                                    </div>
                                </div>
                            ))}
                            {shift.rows.length === 0 && <div className="p-3 text-center text-xs text-gray-400">Nenhuma caixa marcada.</div>}
                        </div>
                    )}
                </div>
            ))}
        </div>

        {/* SECTION 2: DAY TOTALS */}
        <div className="space-y-3">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide border-b pb-1">
                2. Total Geral do Dia
            </h3>
            
            <Card>
                <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-blue-600 font-bold uppercase">Total Caixas</p>
                        <p className="text-2xl font-black text-blue-900">{dayTotals.totalBoxes}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-blue-600 font-bold uppercase">Total R$</p>
                        <p className="text-2xl font-black text-green-700">{formatCurrency(dayTotals.totalValue)}</p>
                    </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="p-3 text-left font-semibold text-gray-600">Colhedor</th>
                                <th className="p-3 text-center font-semibold text-gray-600">Cx</th>
                                <th className="p-3 text-right font-semibold text-gray-600">Ganho</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {dayTotals.rows.map(row => (
                                <tr key={row.pickerId}>
                                    <td className="p-3 font-medium text-gray-800">{row.name}</td>
                                    <td className="p-3 text-center font-bold text-gray-900">{row.boxes}</td>
                                    <td className="p-3 text-right font-medium text-green-700">{formatCurrency(row.value)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>

        {/* ACTIONS */}
        <div className="pt-4 pb-8 space-y-3">
            {isClosed ? (
                <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 shadow-sm mb-4">
                        <div className="bg-green-100 p-2 rounded-full"><Check className="w-6 h-6 text-green-700" /></div>
                        <div>
                            <h4 className="font-bold text-green-800">Dia Finalizado!</h4>
                            <p className="text-xs text-green-700">Este dia agora consta no Resumo Semanal.</p>
                        </div>
                    </div>
                    
                    <Link to="/week">
                        <Button className="w-full h-16 text-lg bg-blue-700 hover:bg-blue-800" size="xl">
                            <CalendarDays className="mr-2 w-6 h-6" />
                            VER RESUMO SEMANAL
                        </Button>
                    </Link>

                    <Button onClick={exportCSV} variant="outline" className="w-full">
                        <Download className="mr-2 w-5 h-5" />
                        Exportar CSV do Dia
                    </Button>

                    <div className="pt-6">
                        <Button 
                            onClick={() => setShowReopenModal(true)} 
                            variant="secondary" 
                            className="w-full h-12 text-gray-600 hover:text-red-600 hover:bg-red-50 border-gray-300"
                        >
                            <Unlock className="mr-2 w-4 h-4" />
                            Reabrir Dia (Correção)
                        </Button>
                    </div>
                </>
            ) : (
                <Button onClick={() => setShowCloseModal(true)} variant="danger" className="w-full h-16 text-lg shadow-lg">
                    <Check className="mr-2 w-6 h-6" />
                    FECHAR O DIA
                </Button>
            )}
        </div>

        {/* MODAL: CONFIRM CLOSE */}
        {showCloseModal && (
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] border-4 border-gray-900">
                    {/* Modal Header */}
                    <div className="bg-red-600 p-4 text-white shrink-0">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-8 h-8" />
                            <h3 className="font-black text-xl uppercase">Confirmar Fechamento</h3>
                        </div>
                        <p className="text-red-100 text-sm font-bold">
                            Ao confirmar, o dia entra no <strong>Resumo Semanal</strong> e bloqueia edições.
                        </p>
                    </div>

                    {/* Modal Body (Scrollable) */}
                    <div className="p-4 overflow-y-auto grow">
                        <div className="text-center mb-4 border-b-2 border-dashed border-gray-300 pb-4">
                            <h2 className="text-2xl font-black text-gray-900">{dateDisplay}</h2>
                            <p className="capitalize text-gray-500 font-bold">{weekDayDisplay}</p>
                        </div>

                        <div className="space-y-3 mb-4">
                            <p className="text-xs font-black text-gray-500 uppercase">Resumo por Turno</p>
                            {shiftsData.map(s => (
                                <div key={s.id} className="flex justify-between text-sm bg-gray-100 p-2 rounded border border-gray-200">
                                    <span className="font-bold">#{s.shiftNumber} {s.orchardNameSnapshot}</span>
                                    <span className="font-black text-gray-900">{s.totalBoxes} cx</span>
                                </div>
                            ))}
                        </div>

                        <div className="bg-gray-100 p-4 rounded-lg space-y-2 border-2 border-gray-200">
                            <div className="flex justify-between text-lg">
                                <span className="text-gray-800 font-bold">Total Geral:</span>
                                <span className="font-black">{dayTotals.totalBoxes} cx</span>
                            </div>
                            <div className="flex justify-between text-xl border-t-2 border-gray-300 pt-2">
                                <span className="text-gray-800 font-bold">A Pagar:</span>
                                <span className="font-black text-green-700">{formatCurrency(dayTotals.totalValue)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 border-t-2 border-gray-200 shrink-0 flex gap-3">
                        <Button variant="outline" onClick={() => setShowCloseModal(false)} className="flex-1 border-2 border-gray-400">
                            Voltar
                        </Button>
                        <Button variant="danger" onClick={handleCloseDay} className="flex-1">
                            CONFIRMAR
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL: REOPEN */}
        {showReopenModal && (
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border-4 border-red-500">
                     <div className="bg-red-100 p-4 text-red-900">
                        <div className="flex items-center gap-2 mb-2">
                            <Unlock className="w-6 h-6" />
                            <h3 className="font-black text-lg uppercase">Reabrir Dia?</h3>
                        </div>
                        <p className="text-sm font-bold">
                            Isso removerá este dia do Resumo Semanal e permitirá alterar as contagens novamente.
                        </p>
                    </div>
                    <div className="p-4 flex gap-3">
                        <Button variant="outline" onClick={() => setShowReopenModal(false)} className="flex-1">
                            Cancelar
                        </Button>
                        <Button variant="danger" onClick={handleReopenDay} className="flex-1">
                            REABRIR AGORA
                        </Button>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}