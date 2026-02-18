"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  backUrl?: string;
  action?: React.ReactNode;
}

export function Header({ title, showBack, backUrl, action }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-blue-700 text-white shadow-md">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192x192.png" alt="Turmeiro" className="h-8 w-8 rounded-lg border border-white/30" />
          {showBack ? (
            <Link href={backUrl || "/"} className="p-2 -ml-2 hover:bg-blue-600 rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          ) : (
            <Link href="/" className="p-2 -ml-2 hover:bg-blue-600 rounded-full">
              <Home className="w-6 h-6" />
            </Link>
          )}
          <img src="/logo.svg" alt="Turmeiro Caixas" className="h-8 w-auto hidden sm:block" />
          <h1 className="text-lg font-bold truncate max-w-[200px]">{title}</h1>
        </div>
        <div>{action}</div>
      </div>
    </header>
  );
}