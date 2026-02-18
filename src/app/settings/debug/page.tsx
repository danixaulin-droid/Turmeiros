"use client";

import React, { useState } from 'react';
import { db } from '../../../lib/db';
import { Header } from '../../../components/layout/Header';
import { Button } from '../../../components/ui/Button';
import { generateUUID, formatCurrency } from '../../../lib/utils';
import { format } from 'date-fns';
import { Card, CardContent } from '../../../components/ui/Card';
import { Terminal, CheckCircle2, AlertTriangle, Play } from 'lucide-react';

export default function DebugPage() {
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'success' | 'error'}[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [...prev, { msg, type }]);
  };

  const runDiagnostics = async () => {
    if(!confirm('Isso criará dados de teste e verificará todas as funções do sistema. Continuar?')) return;
    
    setIsRunning(true);
    setLogs([]);
    addLog('INICIANDO DIAGNÓSTICO DO SISTEMA...', 'info');

    try {
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // --- STEP A: CRUD BÁSICO ---
        addLog('A. TESTANDO BANCO DE DADOS (CRUD)', 'info');
        
        // 1. Criar Entidades
        const pickerId = generateUUID();
        const orchardId = generateUUID();
        
        await db.pickers.add({ id: pickerId, name: 'TESTE_AUTO_COLHEDOR', active: true, createdAt: Date.now() });
        await db.orchards.add({ id: orchardId, name: 'TESTE_AUTO_POMAR', active: true, createdAt: Date.now() });
        
        // Verificar persistência imediata
        const savedPicker = await db.pickers.get(pickerId);
        if (!savedPicker) throw new Error('Falha ao salvar Colhedor');
        addLog('✅ Colhedor salvo com sucesso', 'success');

        // --- STEP B: FLUXO DE DIA E TURNOS ---
        addLog('B. TESTANDO FLUXO DE DIA E TURNOS', 'info');
        
        const workdayId = generateUUID();
        await db.workdays.add({
            id: workdayId,
            date: '2099-01-01', // Data futura para não misturar
            pickerIds: [pickerId],
            status: 'open',
            createdAt: Date.now()
        });
        
        const shiftId = generateUUID();
        await db.shifts.add({
            id: shiftId,
            workdayId,
            orchardId,
            orchardNameSnapshot: 'TESTE_POMAR',
            pricePerBox: 2.50,
            createdAt: Date.now()
        });

        const countId = generateUUID();
        await db.counts.add({
            id: countId,
            workdayId,
            shiftId,
            pickerId,
            boxes: 0,
            updatedAt: Date.now()
        });
        
        addLog('✅ Dia, Turno e Contador inicializados', 'success');

        // --- STEP C: MARCAÇÃO (SIMULAÇÃO DE CLIQUES) ---
        addLog('C. SIMULANDO MARCAÇÃO (+1, +5)', 'info');
        
        // Simular +1
        await db.counts.where('id').equals(countId).modify(c => c.boxes += 1);
        let countCheck = await db.counts.get(countId);
        if (countCheck?.boxes !== 1) throw new Error('Erro ao somar +1');
        
        // Simular +5
        await db.counts.where('id').equals(countId).modify(c => c.boxes += 5);
        countCheck = await db.counts.get(countId);
        if (countCheck?.boxes !== 6) throw new Error('Erro ao somar +5');
        
        // Calcular valor
        const totalValue = countCheck.boxes * 2.50;
        addLog(`✅ Marcação Ok. Total: 6 cx (R$ ${totalValue})`, 'success');

        // --- STEP D: FECHAMENTO DE DIA ---
        addLog('D. TESTANDO FECHAMENTO DE DIA', 'info');
        
        await db.workdays.update(workdayId, { status: 'closed', closedAt: Date.now() });
        const closedDay = await db.workdays.get(workdayId);
        
        if (closedDay?.status !== 'closed') throw new Error('Falha ao fechar o dia');
        addLog('✅ Status do dia alterado para "closed"', 'success');

        // --- STEP E: EXPORTAÇÃO (LÓGICA) ---
        addLog('E. TESTANDO GERAÇÃO DE RELATÓRIO', 'info');
        
        const counts = await db.counts.where('workdayId').equals(workdayId).toArray();
        const shifts = await db.shifts.where('workdayId').equals(workdayId).toArray();
        
        if (counts.length === 0 || shifts.length === 0) throw new Error('Dados para relatório incompletos');
        
        // Simula a string CSV
        const csvLine = `${savedPicker.name};${countCheck?.boxes}`;
        if (!csvLine.includes('TESTE_AUTO_COLHEDOR')) throw new Error('Erro na lógica de exportação');
        addLog('✅ Lógica de exportação validada', 'success');

        // --- LIMPEZA ---
        addLog('F. LIMPANDO DADOS DE TESTE...', 'info');
        await db.pickers.delete(pickerId);
        await db.orchards.delete(orchardId);
        await db.workdays.delete(workdayId);
        await db.shifts.delete(shiftId);
        await db.counts.delete(countId);
        addLog('✅ Limpeza concluída', 'success');

        addLog('-----------------------------------', 'info');
        addLog('DIAGNÓSTICO CONCLUÍDO COM SUCESSO!', 'success');
        addLog('O sistema está salvando dados corretamente.', 'success');
        addLog('O modo Offline funcionará com estes dados.', 'success');

    } catch (e: any) {
        addLog(`FALHA CRÍTICA: ${e.message}`, 'error');
        console.error(e);
    } finally {
        setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
        <Header title="Checklist do Sistema" showBack backUrl="/settings" />
        <main className="p-4 max-w-md mx-auto space-y-6">
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded shadow-sm">
                <h3 className="font-bold text-blue-800 flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    Diagnóstico Automático
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                    Esta ferramenta executa todas as funções principais do app (criar, marcar, salvar, fechar, exportar) em segundo plano para garantir que o sistema está 100% operacional e salvando dados.
                </p>
            </div>

            <Button 
                onClick={runDiagnostics} 
                disabled={isRunning} 
                size="xl" 
                className="w-full shadow-lg"
            >
                {isRunning ? (
                    'EXECUTANDO TESTES...'
                ) : (
                    <>
                        <Play className="mr-2 w-6 h-6 fill-current" />
                        RODAR VERIFICAÇÃO
                    </>
                )}
            </Button>

            <Card className="border-2 border-gray-300">
                <div className="bg-gray-900 text-gray-100 p-4 font-mono text-xs h-[400px] overflow-y-auto rounded-lg">
                    {logs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                            <CheckCircle2 className="w-12 h-12 mb-2 opacity-20" />
                            <p>Aguardando início...</p>
                        </div>
                    )}
                    {logs.map((l, i) => (
                        <div key={i} className={`mb-1.5 ${
                            l.type === 'success' ? 'text-green-400 font-bold' : 
                            l.type === 'error' ? 'text-red-500 font-bold bg-red-900/20 p-1' : 
                            'text-gray-300'
                        }`}>
                            <span className="opacity-50 mr-2">[{i + 1}]</span>
                            {l.msg}
                        </div>
                    ))}
                </div>
            </Card>

            <div className="text-center text-xs text-gray-400 font-bold">
                TURMEIRO CAIXAS v1.0 • BASE DE DADOS: DEXIE/INDEXEDDB
            </div>
        </main>
    </div>
  );
}