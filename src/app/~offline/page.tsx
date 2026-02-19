export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
      <div className="max-w-sm w-full bg-white border-2 border-gray-900 rounded-2xl shadow p-5 space-y-3">
        <h1 className="text-2xl font-black text-gray-900">Sem internet</h1>
        <p className="text-sm font-bold text-gray-700">
          O app está offline. Seus dados continuam salvos no celular.
        </p>
        <p className="text-xs text-gray-500">
          Dica: abra o app uma vez com internet para ele guardar as telas no cache. Depois funciona no pomar sem sinal.
        </p>
      </div>
    </div>
  );
}
