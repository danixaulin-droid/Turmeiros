import React from 'react';
import Link from 'next/link';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Users, Trees, TestTube2, Accessibility, Eye } from 'lucide-react';
import { useSettings } from '../../lib/SettingsContext';

export default function SettingsPage() {
  const { isEasyMode, toggleEasyMode } = useSettings();

  return (
    <div className="min-h-screen">
      <Header title="Configurações" showBack />
      <main className="max-w-md mx-auto p-4 space-y-4">
        
        {/* EASY MODE TOGGLE CARD */}
        <div 
            onClick={toggleEasyMode}
            className={`p-6 rounded-xl border-4 cursor-pointer transition-all shadow-md ${
                isEasyMode 
                ? 'bg-blue-100 border-blue-600' 
                : 'bg-white border-gray-300'
            }`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {isEasyMode ? <Accessibility className="w-10 h-10 text-blue-700" /> : <Eye className="w-8 h-8 text-gray-500" />}
                    <div>
                        <h3 className={`font-black text-xl ${isEasyMode ? 'text-blue-900' : 'text-gray-900'}`}>
                            Modo Fácil (Idoso)
                        </h3>
                        <p className="text-sm font-bold text-gray-600 mt-1">
                            {isEasyMode ? 'Ativado: Botões grandes e letras maiores.' : 'Desativado: Visual padrão.'}
                        </p>
                    </div>
                </div>
                <div className={`w-14 h-8 rounded-full p-1 flex items-center transition-colors ${isEasyMode ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}>
                    <div className="w-6 h-6 bg-white rounded-full shadow-sm"></div>
                </div>
            </div>
        </div>

        <Link href="/settings/pickers" className="block mt-6">
          <Button variant="outline" className="w-full h-20 text-lg justify-start font-bold">
            <Users className="mr-4 w-8 h-8 text-blue-600" />
            Cadastrar Colhedores
          </Button>
        </Link>
        <Link href="/settings/orchards" className="block">
          <Button variant="outline" className="w-full h-20 text-lg justify-start font-bold">
            <Trees className="mr-4 w-8 h-8 text-green-600" />
            Cadastrar Pomares
          </Button>
        </Link>
        <Link href="/settings/debug" className="block mt-8">
            <Button variant="secondary" className="w-full justify-start text-gray-500 h-14">
                <TestTube2 className="mr-4 w-6 h-6" />
                Teste Automático (Debug)
            </Button>
        </Link>
      </main>
    </div>
  );
}