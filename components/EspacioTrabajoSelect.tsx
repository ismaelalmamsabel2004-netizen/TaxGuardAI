"use client";

type EspacioCliente = { idCompleto: string; nombreVisible: string; propietarioId?: string };

export default function EspacioTrabajoSelect({
  empresaId,
  empresas,
  espaciosCliente = [],
  onChange,
  disabled = false,
}: {
  empresaId: string;
  empresas: string[];
  espaciosCliente?: EspacioCliente[];
  onChange: (valor: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={empresaId}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="flex-1 bg-slate-800 text-white text-sm font-bold p-2.5 rounded-xl border border-slate-700 outline-none w-full disabled:opacity-50"
      style={{ textOverflow: 'ellipsis' }}
    >
      <optgroup label="Mis Espacios Personales">
        {empresas.map((e) => (
          <option key={`PROPIO_${e}`} value={e}>
            {e}
          </option>
        ))}
      </optgroup>
      {espaciosCliente.length > 0 && (
        <optgroup label="Clientes (Modo Asesor)">
          {espaciosCliente.map((c) => (
            <option key={c.idCompleto} value={c.idCompleto}>
              👁️ {c.nombreVisible}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
