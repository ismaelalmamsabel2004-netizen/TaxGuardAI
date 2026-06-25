"use client";

import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Ene', total: 2400 },
  { name: 'Feb', total: 1398 },
  { name: 'Mar', total: 4800 },
  { name: 'Abr', total: 3908 },
  { name: 'May', total: 4800 },
  { name: 'Jun', total: 4250 },
];

export default function Home() {
  const [aiAnalysis, setAiAnalysis] = useState("Consultando a Gemini...");

  useEffect(() => {
    let cancelled = false;

    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then((res) => {
        if (!cancelled) {
          setAiAnalysis(res.analysis || "No se pudo obtener un análisis en este momento.");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAiAnalysis("Ups, hubo un problema: " + err.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 px-6 py-8 flex flex-col justify-between">
          <h2 className="text-2xl font-black text-slate-800 mb-10">TaxGuard<span className="text-blue-600">AI</span></h2>
          <UserButton />
      </aside>

      <main className="flex-1 p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Análisis Fiscal con IA</h1>
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Informe de Gemini</h3>
            {/* AQUÍ ESTÁ EL CAMBIO: Reemplazamos el <p> por ReactMarkdown y le damos estilos para listas y párrafos */}
            <div className="text-gray-700 leading-relaxed [&>p]:mb-4 [&>ul]:list-disc [&>ul]:ml-6 [&>ol]:list-decimal [&>ol]:ml-6 [&>strong]:text-slate-900">
              <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
            </div>
        </div>

        <div className="h-64 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#2563eb" />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}