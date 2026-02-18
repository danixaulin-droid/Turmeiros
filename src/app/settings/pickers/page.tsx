"use client";

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Picker } from '../../../lib/db';
import { Header } from '../../../components/layout/Header';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { generateUUID } from '../../../lib/utils';
import { Plus, UserX, UserCheck, Trash2 } from 'lucide-react';

export default function PickersPage() {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const pickers = useLiveQuery(() => db.pickers.orderBy('name').toArray());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      await db.pickers.update(editingId, { name, nickname });
      setEditingId(null);
    } else {
      await db.pickers.add({
        id: generateUUID(),
        name,
        nickname,
        active: true,
        createdAt: Date.now()
      });
    }
    setName('');
    setNickname('');
  };

  const toggleStatus = async (picker: Picker) => {
    await db.pickers.update(picker.id, { active: !picker.active });
  };

  const startEdit = (picker: Picker) => {
    setName(picker.name);
    setNickname(picker.nickname || '');
    setEditingId(picker.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Colhedores" showBack backUrl="/settings" />
      <main className="max-w-md mx-auto p-4 space-y-6">
        
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Ex: João da Silva"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Apelido (Opcional)</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Ex: Joãozinho"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingId ? 'Salvar Alteração' : 'Adicionar Colhedor'}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={() => {
                    setEditingId(null);
                    setName('');
                    setNickname('');
                  }}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="font-bold text-lg text-gray-700">Lista ({pickers?.length || 0})</h3>
          {pickers?.map(picker => (
            <Card key={picker.id} className={!picker.active ? 'opacity-60 bg-gray-100' : ''}>
              <div className="p-4 flex justify-between items-center">
                <div onClick={() => startEdit(picker)} className="cursor-pointer flex-1">
                  <p className="font-bold text-lg">{picker.name}</p>
                  {picker.nickname && <p className="text-sm text-gray-600">"{picker.nickname}"</p>}
                  {!picker.active && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Inativo</span>}
                </div>
                <button
                  onClick={() => toggleStatus(picker)}
                  className="p-3 text-gray-500 hover:bg-gray-200 rounded-full"
                  title={picker.active ? "Desativar" : "Ativar"}
                >
                  {picker.active ? <UserCheck className="text-green-600" /> : <UserX className="text-red-500" />}
                </button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}