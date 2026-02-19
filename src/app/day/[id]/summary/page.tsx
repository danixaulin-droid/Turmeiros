"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../lib/db";
import { Header } from "../../../../components/layout/Header";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { formatCurrency } from "../../../../lib/utils";
import { format } from "date-fns";
import FileSaver from "file-saver";
import { Download, Check, CalendarDays } from "lucide-react";

/** ✅ Tipos para evitar "implicit any" no build da Vercel */
type PickerRow = {
  pickerId: string;
  name: string;
  boxes: number;
  value: number;
};

type ShiftData = {
  id: string;
  orchardNameSnapshot?: string;
  pricePerBox: number;
  createdAt: number;
  shiftNumber: number;
  rows: PickerRow[];
  totalBoxes: number;
  totalValue: number;
};

type OrchardData = {
  orchardName: string;
  rows: PickerRow[];
  totalBoxes: number;
  totalValue: number;
  shifts: ShiftData[];
};

export default function DaySummaryPage() {
  const params = useParams();
  const workdayId = (params as any).id as string;

  const [isClosing, setIsClosing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);

  const workday = useLiveQuery(
    () => (workdayId ? db.workdays.get(workdayId) : undefined),
    [workdayId]
  );

  const shifts = useLiveQuery(
    () =>
      workdayId
        ? db.shifts.where("workdayId").equals(workdayId).toArray()
        : [],
    [workdayId]
  );

  const allCounts = useLiveQuery(
    () =>
      workdayId
        ? db.counts.where("workdayId").equals(workdayId).toArray()
        : [],
    [workdayId]
  );

  const pickers = useLiveQuery(() => db.pickers.toArray());

  const isClosed = workday?.status === "closed";

  // ---------------- SHIFT DETAILS ----------------
  const shiftsData: ShiftData[] = useMemo(() => {
    if (!shifts || !allCounts || !pickers) return [];

    const sortedShifts = [...shifts].sort((a: any, b: any) => a.createdAt - b.createdAt);

    return sortedShifts.map((shift: any, index: number) => {
      const shiftCounts = allCounts.filter((c: any) => c.shiftId === shift.id);

      const rows: PickerRow[] = shiftCounts
        .map((c: any) => {
          const picker = pickers.find((p: any) => p.id === c.pickerId);
          return {
            pickerId: c.pickerId,
            name: picker?.name || "Desconhecido",
            boxes: c.boxes,
            value: c.boxes * shift.pricePerBox,
          };
        })
        .filter((r: PickerRow) => r.boxes > 0)
        .sort((a: PickerRow, b: PickerRow) => b.boxes - a.boxes);

      const totalBoxes = rows.reduce((sum: number, r: PickerRow) => sum + r.boxes, 0);
      const totalValue = rows.reduce((sum: number, r: PickerRow) => sum + r.value, 0);

      return {
        id: shift.id,
        orchardNameSnapshot: shift.orchardNameSnapshot,
        pricePerBox: shift.pricePerBox,
        createdAt: shift.createdAt,
        shiftNumber: index + 1,
        rows,
        totalBoxes,
        totalValue,
      };
    });
  }, [shifts, allCounts, pickers]);

  // ---------------- DAY TOTALS ----------------
  const dayTotals = useMemo(() => {
    if (!shiftsData) return { rows: [] as PickerRow[], totalBoxes: 0, totalValue: 0 };

    const pickerMap = new Map<string, PickerRow>();

    shiftsData.forEach((shiftData) => {
      shiftData.rows.forEach((row: PickerRow) => {
        const current =
          pickerMap.get(row.pickerId) || {
            pickerId: row.pickerId,
            name: row.name,
            boxes: 0,
            value: 0,
          };

        current.boxes += row.boxes;
        current.value += row.value;

        pickerMap.set(row.pickerId, current);
      });
    });

    const rows = Array.from(pickerMap.values()).sort((a, b) => b.value - a.value);
    const totalBoxes = rows.reduce((sum, r) => sum + r.boxes, 0);
    const totalValue = rows.reduce((sum, r) => sum + r.value, 0);

    return { rows, totalBoxes, totalValue };
  }, [shiftsData]);

  // ---------------- ORCHARD TOTALS (quando troca de pomar no mesmo dia) ----------------
  const orchardsData: OrchardData[] = useMemo(() => {
    if (!shiftsData) return [];

    const orchardMap = new Map<string, OrchardData>();

    shiftsData.forEach((shift) => {
      const key = shift.orchardNameSnapshot || "Sem Pomar";

      const existing =
        orchardMap.get(key) || {
          orchardName: key,
          rows: [],
          totalBoxes: 0,
          totalValue: 0,
          shifts: [],
        };

      existing.shifts.push(shift);
      existing.totalBoxes += shift.totalBoxes;
      existing.totalValue += shift.totalValue;

      // agrega por colhedor dentro do pomar
      const pickerMap = new Map<string, PickerRow>();

      existing.rows.forEach((r: PickerRow) => {
        pickerMap.set(r.pickerId, { ...r });
      });

      shift.rows.forEach((r: PickerRow) => {
        const cur =
          pickerMap.get(r.pickerId) || {
            pickerId: r.pickerId,
            name: r.name,
            boxes: 0,
            value: 0,
          };
        cur.boxes += r.boxes;
        cur.value += r.value;
        pickerMap.set(r.pickerId, cur);
      });

      existing.rows = Array.from(pickerMap.values()).sort((a, b) => b.boxes - a.boxes);
      orchardMap.set(key, existing);
    });

    return Array.from(orchardMap.values()).sort((a, b) => b.totalBoxes - a.totalBoxes);
  }, [shiftsData]);

  // ✅ FECHAR DIA (com trava anti-duplo clique)
  const handleCloseDay = async () => {
    if (!workdayId) return;
    if (isClosing) return;

    try {
      setIsClosing(true);

      await db.workdays.update(workdayId, {
        status: "closed",
        closedAt: Date.now(),
      });

      setShowCloseModal(false);
    } catch (err) {
      console.error("Erro ao fechar o dia:", err);
      alert("Não foi possível fechar o dia. Tente novamente.");
    } finally {
      setIsClosing(false);
    }
  };

  // ✅ REABRIR (se você usar depois)
  const handleReopenDay = async () => {
    if (!workdayId) return;
    if (isReopening) return;

    try {
      setIsReopening(true);

      await db.workdays.update(workdayId, {
        status: "open",
        reopenedAt: Date.now(),
      });

      setShowReopenModal(false);
    } catch (err) {
      console.error("Erro ao reabrir o dia:", err);
      alert("Não foi possível reabrir o dia. Tente novamente.");
    } finally {
      setIsReopening(false);
    }
  };

  const exportCSV = () => {
    if (!workday) return;

    let csvContent = "Colhedor;Caixas;Valor_Total\n";

    dayTotals.rows.forEach((row) => {
      csvContent += `${row.name};${row.boxes};${row.value
        .toFixed(2)
        .replace(".", ",")}\n`;
    });

    csvContent += `TOTAL;${dayTotals.totalBoxes};${dayTotals.totalValue
      .toFixed(2)
      .replace(".", ",")}\n`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    FileSaver.saveAs(blob, `relatorio_dia_${workday.date}.csv`);
  };

  if (!workday) return <div className="p-4">Carregando...</div>;

  const dateDisplay = format(new Date(workday.date + "T00:00:00"), "dd/MM/yyyy");

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Resumo e Fechamento" showBack />

      <main className="max-w-md mx-auto p-4 space-y-6">
        <h2 className="text-2xl font-bold text-center">{dateDisplay}</h2>

        {/* 1) Por Pomar */}
        <div className="space-y-3">
          <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide border-b pb-1">
            Por Pomar
          </h3>

          {orchardsData.map((orch) => (
            <Card key={orch.orchardName}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-gray-900 text-lg leading-tight">
                      {orch.orchardName}
                    </div>
                    <div className="text-xs text-gray-500 font-semibold mt-1">
                      {orch.shifts.length} turno(s)
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-gray-900">{orch.totalBoxes} cx</div>
                    <div className="text-xs font-bold text-green-700">
                      {formatCurrency(orch.totalValue)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 border-t pt-3 space-y-2">
                  {orch.rows.map((row) => (
                    <div
                      key={row.pickerId}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-800 font-medium">{row.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-gray-900">{row.boxes}</span>
                        <span className="w-20 text-right text-green-700 font-semibold">
                          {formatCurrency(row.value)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {orch.rows.length === 0 && (
                    <div className="text-center text-xs text-gray-400 py-2">
                      Nenhuma caixa marcada neste pomar.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* 2) Total do Dia */}
        <Card>
          <div className="p-4 space-y-2">
            {dayTotals.rows.map((row) => (
              <div key={row.pickerId} className="flex justify-between text-sm">
                <span className="text-gray-800 font-medium">{row.name}</span>
                <span className="font-black text-gray-900">{row.boxes} cx</span>
              </div>
            ))}

            <div className="pt-3 mt-3 border-t flex justify-between font-black">
              <span>Total</span>
              <span>{dayTotals.totalBoxes} cx</span>
            </div>
            <div className="flex justify-between font-black text-green-700">
              <span>Total a Pagar</span>
              <span>{formatCurrency(dayTotals.totalValue)}</span>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          {isClosed ? (
            <>
              <Link href="/week">
                <Button className="w-full">
                  <CalendarDays className="mr-2 w-4 h-4" />
                  Ver Resumo Semanal
                </Button>
              </Link>

              <Button onClick={exportCSV} variant="outline" className="w-full">
                <Download className="mr-2 w-4 h-4" />
                Exportar CSV
              </Button>

              {/* Se quiser reabrir com botão depois, eu reativo */}
              {/* <Button onClick={handleReopenDay} variant="secondary" className="w-full" disabled={isReopening}>
                Reabrir Dia
              </Button> */}
            </>
          ) : (
            <Button
              onClick={handleCloseDay}
              disabled={isClosing}
              variant="danger"
              className="w-full"
            >
              <Check className="mr-2 w-4 h-4" />
              {isClosing ? "Fechando..." : "Fechar Dia"}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
