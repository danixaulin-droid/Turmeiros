"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../../lib/db';
import { Header } from '../../../../components/layout/Header';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent } from '../../../../components/ui/Card';
import { generateUUID } from '../../../../lib/utils';

export default function NewShiftPage() {
  const params = useParams();
  const workdayId = (params as any).id as string;
  const router = useRouter();
  const [orchardId, setOrchardId] = useState('');
  const [pricePerBox, setPricePerBox] = useState('');
  const [error, setError] = useState('');

  const workday = useLiveQuery(() => workdayId ? db.workdays.get(workdayId) : undefined, [workdayId]);
  const orchards = useLiveQuery(() => db.orchards.orderBy('name').filter(o => o.active).toArray());

  const handleCreateShift = async () => {
    if (!workdayId || !workday) return;
    if (!orchardId) return setError('Selecione um pomar');
    if (!pricePerBox || Number(pricePerBox) <= 0) return setError('Preço inválido');

    const orchard = orchards?.find(o => o.id === orchardId);
    if (!orchard) return;

    try {
        const shiftId = generateUUID();
        
        // 1. Create New Shift
        await db.shifts.add({
            id: shiftId,
            workdayId,
            orchardId,
            orchardNameSnapshot: orchard.name,
            pricePerBox: Number(pricePerBox),
            createdAt: Date.now()
        });

        // 2. Initialize new counts for this shift (boxes start at 0)
        // We use the pickers already defined in the Workday
        const countPromises = workday.pickerIds.map(pickerId => ({
            id: generateUUID(),
            workdayId,
            shiftId,
            pickerId,
            boxes: 0,
            updatedAt: Date.now()
        }));
        
        await db.counts.bulkAdd(countPromises);

        // Go back to marking (it will auto-detect the new latest shift)
        router.push(`/day/${workdayId}/mark`);
    } catch (err) {
        console.error(err);
        setError('Erro ao criar turno.');
    }
  };

  if (!workday) return <div>Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Trocar Pomar / Preço" showBack />
      <main className="max-w-md mx-auto p-4 space-y-6">
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-sm text-yellow-800">
                Isso iniciará um <strong>novo turno</strong>. As caixas marcadas até agora ficarão salvas no turno anterior e a contagem reiniciará para o novo local/preço.
            </p>
        </div>

        <Card>
          <CardContent className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Novo Pomar</label>
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
              <label className="block font-medium mb-1">Novo Preço por Caixa (R$)</label>
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

        {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}

        <Button onClick={handleCreateShift} className="w-full" size="xl">
            CONFIRMAR TROCA
        </Button>

      </main>
    </div>
  );
}