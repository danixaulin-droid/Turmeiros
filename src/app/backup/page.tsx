"use client";

import React, { useRef } from 'react';
import { db } from '../../lib/db';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import FileSaver from 'file-saver';
import { Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import Dexie from 'dexie';

export default function BackupPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const dbAny = db as any;
      const allData = await dbAny.transaction('r', dbAny.tables, () => {
        return Promise.all(
          dbAny.tables.map((table: any) => table.toArray().then((rows: any) => ({ table: table.name, rows })))
        );
      });
      
      const blob = new Blob([JSON.stringify(allData)], { type: "application/json;charset=utf-8" });
      FileSaver.saveAs(blob, `turmeiro_backup_${new Date().toISOString().split('T')[0]}.json`);
    } catch (e) {
      alert('Erro ao exportar');
      console.error(e);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('ATENÇÃO: Isso irá substituir/mesclar dados. Recomendamos exportar um backup atual antes. Continuar?')) {
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const dbAny = db as any;
        await dbAny.transaction('rw', dbAny.tables, async () => {
            for (const { table, rows } of data) {
                await dbAny.table(table).bulkPut(rows);
            }
        });
        alert('Dados importados com sucesso!');
        window.location.reload();
      } catch (err) {
        alert('Arquivo inválido ou erro na importação.');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    if (confirm('TEM CERTEZA? Isso apagará TODOS os dados do aplicativo para sempre.')) {
        if(confirm('Realmente deseja apagar tudo? Essa ação não tem volta.')) {
            await (db as any).delete();
            window.location.reload();
        }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Backup" showBack />
      <main className="max-w-md mx-auto p-4 space-y-6">
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
                <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3" />
                <div>
                    <p className="font-bold text-yellow-700">Segurança dos Dados</p>
                    <p className="text-sm text-yellow-600">
                        Como este app funciona offline, seus dados ficam apenas neste aparelho. 
                        Faça backups (Baixar Dados) semanalmente e guarde o arquivo no WhatsApp ou Google Drive.
                    </p>
                </div>
            </div>
        </div>

        <Card>
            <CardContent className="space-y-4 pt-6">
                <Button onClick={handleExport} className="w-full h-16" size="lg">
                    <Download className="mr-3 w-6 h-6" />
                    Baixar Dados (Backup)
                </Button>
                
                <div className="relative">
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        accept=".json"
                        onChange={handleImport}
                        className="hidden"
                    />
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full h-16" size="lg">
                        <Upload className="mr-3 w-6 h-6" />
                        Restaurar Backup
                    </Button>
                </div>
            </CardContent>
        </Card>

        <div className="pt-8 border-t">
            <h3 className="text-red-600 font-bold mb-2">Zona de Perigo</h3>
            <Button onClick={handleReset} variant="danger" className="w-full">
                <Trash2 className="mr-2 w-5 h-5" />
                Apagar Tudo (Reset)
            </Button>
        </div>

      </main>
    </div>
  );
}