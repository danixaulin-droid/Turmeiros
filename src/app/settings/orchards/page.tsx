"use client";

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Orchard } from '../../../lib/db';
import { Header } from '../../../components/layout/Header';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { generateUUID } from '../../../lib/utils';
import { Trash2 } from 'lucide-react';

export default function OrchardsPage() {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const orchards = useLiveQuery(() => db.orchards.orderBy('name').toArray());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      await db.orchards.update(editingId, { name });
      setEditingId(null);
    } else {
      await db.orchards.add({
        id: generateUUID(),
        name,
        active: true,
        createdAt: Date.now()
      });
    }
    setName('');
  };

  const startEdit = (orchard: Orchard) => {
    setName(orchard.name);
    setEditingId(orchard.id);
  };

  const deleteOrchard = async (id: string) => {
    if(confirm('Tem certeza? Isso não apaga históricos antigos, mas remove da lista.')) {
        await db.orchards.delete(id);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Pomares" showBack backUrl="/settings" />
      <main className="max-w-md mx-auto p-4 space-y-6">
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome do Pomar *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Ex: Fazenda Santa Clara - Talhão 1"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingId ? 'Salvar' : 'Adicionar'}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={() => {
                    setEditingId(null);
                    setName('');
                  }}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
            <h3 className="font-bold text-gray-700">Lista</h3>
          {orchards?.map(orchard => (
            <Card key={orchard.id}>
              <div className="p-4 flex justify-between items-center">
                <div onClick={() => startEdit(orchard)} className="cursor-pointer flex-1">
                  <p className="font-bold">{orchard.name}</p>
                </div>
                 <button
                  onClick={() => deleteOrchard(orchard.id)}
                  className="p-3 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-full"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}