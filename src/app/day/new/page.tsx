"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../lib/db';
import { Header } from '../../../components/layout/Header';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { format } from 'date-fns';
import { generateUUID } from '../../../lib/utils';

export default function NewDayPage() {
  const router = useRouter();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [orchardId, setOrchardId] = useState('');
  const [pricePerBox, setPricePerBox] = useState('');
  const [selectedPickers, setSelectedPickers] = useState<string[]>([]);
  const [error, setError] = useState('');

  const orchards = useLiveQuery(() => db.orchards.orderBy('name').filter(o => o.active).toArray());
  const pickers = useLiveQuery(() => db.pickers.orderBy('name').filter(p => p.active).toArray());

  const checkExisting = async () => {
    const existing = await db.workdays.where('date').equals(date).first();
    if (existing) {
        if(confirm(`Já existe uma diária para ${date}. Deseja abrir a existente?`)) {
            router.push(`/day/${existing.id}/mark`);
        }
    }
  };

  useEffect(() => {
    if(date) checkExisting();
  }, [date]);

  useEffect(() => {
    if (pickers) {
      setSelectedPickers(pickers.map(p => p.id));
    }
  }, [pickers]);

  const togglePicker = (id: string) => {
    setSelectedPickers(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!orchardId) return setError('Selecione um pomar');
    if (!pricePerBox || Number(pricePerBox) <= 0) return setError('Preço inválido');
    if (selectedPickers.length === 0) return setError('Selecione ao menos um colhedor');

    const orchard = orchards?.find(o => o.id === orchardId);
    if (!orchard) return;

    try {
        const existing = await db.workdays.where('date').equals(date).first();
        if (existing) {
             setError('Já existe uma diária nesta data.');
             return;
        }

        const workdayId = generateUUID();
        const shiftId = generateUUID();
        const uniquePickerIds = Array.from(new Set(selectedPickers));
        
        // 1. Create Workday
        await db.workdays.add({
            id: workdayId,
            date,
            pickerIds: uniquePickerIds,
            createdAt: Date.now(),
      status: 'open'
    });

        // 2. Create First Shift (Turno 1)
        await db.shifts.add({
            id: shiftId,
            workdayId,
            orchardId: orchardId, // Store ID
            orchardNameSnapshot: orchard.name,
            pricePerBox: Number(pricePerBox),
            createdAt: Date.now()
        });

        // 3. Initialize counts for this specific shift
        const countPromises = uniquePickerIds.map(pickerId => ({
            id: generateUUID(),
            workdayId, 
            shiftId,   
            pickerId,
            boxes: 0,
            updatedAt: Date.now()
        }));
        
        await db.counts.bulkAdd(countPromises);

        router.push(`/day/${workdayId}/mark`);
    } catch (err) {
        console.error(err);
        setError('Erro ao criar diária.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Iniciar Dia" showBack />
      <main className="max-w-md mx-auto p-4 space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Data</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full p-3 border rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Pomar Inicial</label>
              <select 
                value={orchardId} 
                onChange={e => setOrchardId(e.target.value)}
                className="w-full p-3 border rounded-lg bg-white"
              >
                <option value="">Selecione...</option>
                {orchards?.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Preço por Caixa (R$)</label>
              <input 
                type="number" 
                step="0.01"
                inputMode="decimal"
                value={pricePerBox} 
                onChange={e => setPricePerBox(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 border rounded-lg bg-white text-lg font-bold"
              />
            </div>
          </CardContent>
        </Card>

        <div>
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold">Colhedores Presentes ({selectedPickers.length})</h3>
                <button 
                    onClick={() => setSelectedPickers(pickers?.map(p => p.id) || [])}
                    className="text-sm text-blue-600 font-medium"
                >
                    Marcar Todos
                </button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 divide-y max-h-60 overflow-y-auto">
                {pickers?.map(picker => (
                    <label key={picker.id} className="flex items-center p-3 active:bg-gray-100">
                        <input 
                            type="checkbox"
                            checked={selectedPickers.includes(picker.id)}
                            onChange={() => togglePicker(picker.id)}
                            className="w-6 h-6 mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="flex-1 font-medium">{picker.name}</span>
                        {picker.nickname && <span className="text-gray-500 text-sm">({picker.nickname})</span>}
                    </label>
                ))}
            </div>
        </div>
        {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
        <Button onClick={handleCreate} className="w-full" size="xl">INICIAR MARCAÇÃO</Button>
      </main>
    </div>
  );
}