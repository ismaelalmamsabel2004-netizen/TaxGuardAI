"use client";

import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from "react";
import { UserButton, Show, SignInButton } from "@clerk/nextjs"; 
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Home() {
  const [aiAnalysis, setAiAnalysis] = useState("Cargando tus datos financieros...");
  const [data, setData] = useState<{id?: number, name: string, total: number}[]>([]); 
  
  const [mes, setMes] = useState("");
  const [ingreso, setIngreso] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 1. Transformar fecha de YYYY-MM-DD a DD/MM/YYYY
  const formatearFecha = (fechaISO: string) => {
    const partes = fechaISO.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`; 
    }
    return fechaISO;
  };

  // 🆕 2. EL NUEVO CEREBRO: Función que ordena siempre de más antiguo a más nuevo
  const ordenarPorFecha = (datos: any[]) => {
    return [...datos].sort((a, b) => {
      const partesA = a.name.split('/');
      const partesB = b.name.split('/');
      if (partesA.length === 3 && partesB.length === 3) {
        // Javascript cuenta los meses del 0 al 11, por eso restamos 1 al mes
        const fechaA = new Date(partesA[2], partesA[1] - 1, partesA[0]).getTime();
        const fechaB = new Date(partesB[2], partesB[1] - 1, partesB[0]).getTime();
        return fechaA - fechaB; 
      }
      return 0; 
    });
  };

  useEffect(() => {
    fetch('/api/finances')
      .then(res => res.ok ? res.json() : [])
      .then(datosRecuperados => {
        if (datosRecuperados && datosRecuperados.length > 0) {
          // 🆕 Ordenamos los datos nada más descargarlos de la base de datos
          const datosOrdenados = ordenarPorFecha(datosRecuperados);
          setData(datosOrdenados);
          pedirAnalisisGemini(datosOrdenados);
        } else {
          setAiAnalysis("No hay datos suficientes. Añade varias fechas de ingresos para que Gemini pueda analizar tu evolución.");
        }
      })
      .catch(err => console.error("Error al cargar:", err));
  }, []);

  const guardarDato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mes || !ingreso) return;
    setIsSaving(true);

    const fechaBonita = formatearFecha(mes);

    const response = await fetch('/api/finances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: fechaBonita, total: Number(ingreso) })
    });

    if (response.ok) {
      const nuevoRegistro = await response.json(); 
      // 🆕 Metemos el nuevo dato y volvemos a ordenar todo el paquete antes de dibujarlo
      const nuevosDatosOrdenados = ordenarPorFecha([...data, nuevoRegistro]);
      setData(nuevosDatosOrdenados);
      setIngreso(''); 
      pedirAnalisisGemini(nuevosDatosOrdenados);
    } else {
      alert("Hubo un error al guardar en la nube.");
    }
    setIsSaving(false);
  };

  const eliminarDato = async (id: number) => {
    const response = await fetch(`/api/finances?id=${id}`, { method: 'DELETE' });
    
    if (response.ok) {
      const datosRestantes = data.filter(item => item.id !== id);
      setData(datosRestantes);
      
      if (datosRestantes.length < 2) {
        setAiAnalysis("Faltan datos para una comparativa real. Añade más fechas para activar a Gemini.");
      } else {
        pedirAnalisisGemini(datosRestantes);
      }
    } else {
      alert("Error al intentar borrar el dato.");
    }
  };

  const pedirAnalisisGemini = (datosActualizados: any[]) => {
    if (datosActualizados.length < 2) {
      setAiAnalysis("Gemini está esperando a tener al menos 2 registros cronológicos para comparar tu evolución.");
      return;
    }

    setAiAnalysis("Analizando el impacto de tu facturación ordenada...");
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: datosActualizados }),
    })
      .then((res) => res.json())
      .then((res) => setAiAnalysis(res.analysis || "No se pudo obtener análisis. Intenta añadir más datos."))
      .catch((err) => setAiAnalysis("Error: " + err.message));
  };

  return (
    <>
      <Show when="signed-in">
        <div className="flex min-h-screen bg-gray-50">
          <aside className="w-64 bg-white border-r border-gray-200 px-6 py-8 flex flex-col justify-between">
              <h2 className="text-2xl font-black text-slate-900 mb-10">TaxGuard<span className="text-blue-600">AI</span></h2>
              <UserButton />
          </aside>

          <main className="flex-1 p-12">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Panel Financiero</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="flex flex-col gap-6 col-span-1">
                  
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">Registrar Facturación</h3>
                      <form onSubmit={guardarDato} className="flex flex-col gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Fecha</label>
                          <input 
                            type="date" 
                            value={mes}
                            onChange={(e) => setMes(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Ingresos (€)</label>
                          <input 
                            type="number" 
                            placeholder="Ej: 1500" 
                            value={ingreso}
                            onChange={(e) => setIngreso(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
                          />
                        </div>
                        <button 
                          type="submit" 
                          disabled={isSaving}
                          className="mt-2 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                        >
                          {isSaving ? "Guardando..." : "Guardar Registro"}
                        </button>
                      </form>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-md font-bold text-slate-900 mb-3">Historial Registrado</h3>
                    <ul className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                      {data.map((item) => (
                        <li key={item.id} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <span className="font-bold text-slate-700">{item.name} <br/><span className="text-blue-600 text-base">{item.total} €</span></span>
                          <button 
                            onClick={() => item.id && eliminarDato(item.id)}
                            className="text-red-500 hover:text-white hover:bg-red-500 font-bold px-3 py-1 bg-red-50 rounded transition"
                            title="Borrar registro"
                          >
                            X
                          </button>
                        </li>
                      ))}
                      {data.length === 0 && <p className="text-sm text-gray-400">Sin datos aún.</p>}
                    </ul>
                  </div>

                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 col-span-2 min-h-[300px]">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Evolución de Ingresos</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" stroke="#334155" />
                            <YAxis stroke="#334155" />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', color: '#0f172a', borderRadius: '8px' }} />
                            <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Auditoría Financiera Gemini</h3>
                <div className="text-slate-700 font-medium leading-relaxed [&>p]:mb-4 [&>ul]:list-disc [&>ul]:ml-6 [&>ol]:list-decimal [&>ol]:ml-6 [&>strong]:text-slate-900">
                  <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                </div>
            </div>
          </main>
        </div>
      </Show>

      <Show when="signed-out">
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center max-w-sm w-full">
            <h2 className="text-3xl font-black text-slate-900 mb-2">TaxGuard<span className="text-blue-600">AI</span></h2>
            <p className="text-slate-500 mb-8 text-sm">Inicia sesión para acceder a tu panel financiero.</p>
            <div className="flex justify-center">
              <SignInButton mode="modal">
                <button className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition shadow-md">
                  Iniciar Sesión
                </button>
              </SignInButton>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}