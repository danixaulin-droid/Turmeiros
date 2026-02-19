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

export default function DaySummaryPage() {
  const params = useParams();
  const workdayId = (params as any).id as string;

  const [isClosing, setIsClosing] = useState(false); // ✅ CORREÇÃO
  const [isReopening, setIsReopening] = useState(false); // (preparado p/ reabrir caso você use)
  const [showCloseModal, setShowCloseModal] = useState(false); // (mantive, caso você use modal depois)
  const [showReopenModal, setShowReopenModal] = useState(false); // (mantive)

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
  const shiftsData = useMemo(() => {
    if (!shifts || !allCounts || !pickers) return [];

    const sortedShifts = [...shifts].sort((a, b) => a.createdAt - b.createdAt);

    return sortedShifts.map((shift, index) => {
      const shiftCounts = allCounts.filter((c) => c.shiftId === shift.id);

      const rows = shiftCounts
        .map((c) => {
          const picker = pickers.find((p) => p.id === c.pickerId);
          return {
            pickerId: c.pickerId,
            name: picker?.name || "Desconhecido",
            boxes: c.boxes,
            value: c.boxes * shift.pricePerBox,
          };
        })
        .filter((r) => r.boxes > 0)
        .sort((a, b) => b.boxes - a.boxes);

      const totalBoxes = rows.reduce((sum, r) => sum + r.boxes, 0);
      const totalValue = rows.reduce((sum, r) => sum + r.value, 0);

      return {
        shiftNumber: index + 1,
        ...shift,
        rows,
        totalBoxes,
        totalValue,
      };
    });
  }, [shifts, allCounts, pickers]);

  // ---------------- DAY TOTALS ----------------
  const dayTotals = useMemo(() => {
    if (!shiftsData) return { rows: [], totalBoxes: 0, totalValue: 0 };

    const pickerMap = new Map<
      string,
      { pickerId: string; name: string; boxes: number; value: number }
    >();

    shiftsData.forEach((shiftData) => {
      shiftData.rows.forEach((row) => {
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

  // ✅ FECHAR DIA (com trava anti-duplo clique)
  const handleCloseDay = async () => {
    if (!workdayId) return;
    if (isClosing) return; // ✅ evita duplo clique

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

    // Total geral
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

        <Card>
          <div className="p-4 space-y-2">
            {dayTotals.rows.map((row) => (
              <div key={row.pickerId} className="flex justify-between text-sm">
                <span>{row.name}</span>
                <span className="font-bold">{row.boxes} cx</span>
              </div>
            ))}

            <div className="pt-3 mt-3 border-t flex justify-between font-bold">
              <span>Total</span>
              <span>{dayTotals.totalBoxes} cx</span>
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

              {/* Se quiser reabrir com botão depois, me fale que eu reativo aqui */}
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
