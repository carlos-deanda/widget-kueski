function CurrentPageProductCard({
  product,
  trackedProduct,
  isLoading,
  error,
  onRefresh,
  onTrack,
  isTracking,
  onOpenTracking,
}) {
  const priceLabel = product?.price || (product?.currentPrice ? `$${Number(product.currentPrice).toFixed(2)}` : null);
  const canTrack = product && !trackedProduct && !isLoading && !isTracking;
  const pagePrice = Number(product?.currentPrice);
  const trackedPrice = Number(trackedProduct?.currentPrice);
  const canCompareTrackedPrice = Number.isFinite(pagePrice) && Number.isFinite(trackedPrice) && trackedPrice > 0;
  const priceDifference = canCompareTrackedPrice ? pagePrice - trackedPrice : 0;
  const priceDifferencePct = canCompareTrackedPrice ? Math.abs((priceDifference / trackedPrice) * 100) : 0;
  const priceTrendLabel = priceDifference < 0 ? 'Bajó' : priceDifference > 0 ? 'Subió' : 'Sin cambios';
  const priceTrendClass = priceDifference < 0 ? 'text-[#16A34A]' : priceDifference > 0 ? 'text-[#EF4444]' : 'text-[#6B7280]';

  return (
    <section className="mt-4 rounded-3xl border border-[#D1D5DB]/80 bg-white p-5 shadow-[0_10px_26px_rgba(32,33,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase text-[#6B7280]">Producto de la página</p>

          {isLoading ? (
            <p className="mt-2 text-sm font-medium text-[#6B7280]">Detectando producto...</p>
          ) : product ? (
            <>
              <h2 className="mt-2 text-lg font-bold leading-tight text-[#20212A]">{product.name}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {priceLabel && (
                  <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-bold text-[#4B73F8]">
                    {priceLabel}
                  </span>
                )}
                {product.storeName && (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-[#6B7280]">
                    {product.storeName}
                  </span>
                )}
                {trackedProduct && (
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-[#16A34A]">
                    En seguimiento
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm font-medium text-[#6B7280]">
              {error || 'No se detectó un producto en la pestaña activa.'}
            </p>
          )}

          {error && product && (
            <p className="mt-2 text-xs font-medium text-[#EF4444]">{error}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="shrink-0 rounded-full border border-[#D1D5DB] bg-gray-50 px-3 py-2 text-xs font-bold text-[#20212A] transition-all hover:bg-gray-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Actualizar
        </button>
      </div>

      {product && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="mb-2 text-xs font-bold uppercase text-[#6B7280]">Comparativa de tienda</p>

          {trackedProduct && canCompareTrackedPrice ? (
            <div className="rounded-2xl border border-[#D1D5DB] bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#6B7280]">Página actual</p>
                  <p className="mt-1 text-base font-black text-[#20212A]">
                    ${pagePrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#6B7280]">Último registro</p>
                  <p className="mt-1 text-base font-black text-[#20212A]">
                    ${trackedPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <p className={`mt-3 text-xs font-bold ${priceTrendClass}`}>
                {priceTrendLabel}
                {priceDifference !== 0 && ` $${Math.abs(priceDifference).toLocaleString('es-MX', { maximumFractionDigits: 2 })} (${priceDifferencePct.toFixed(0)}%)`}
              </p>
            </div>
          ) : trackedProduct ? (
            <p className="py-1 text-xs font-medium text-[#6B7280]">
              Este producto ya está en seguimiento. Abre su historial para ver los cambios registrados.
            </p>
          ) : (
            <p className="py-1 text-xs font-medium text-[#6B7280]">
              Disponible para seguimiento en esta tienda. Al agregarlo, el widget comparará futuras lecturas contra el historial guardado.
            </p>
          )}
        </div>
      )}

      {product && (
        <div className="mt-4">
          {trackedProduct ? (
            <button
              type="button"
              onClick={onOpenTracking}
              className="w-full rounded-full bg-[#4B73F8] py-3 text-sm font-bold text-white transition-all hover:bg-[#345ee8] active:scale-[0.98]"
            >
              Ver seguimiento
            </button>
          ) : (
            <button
              type="button"
              onClick={onTrack}
              disabled={!canTrack}
              className="w-full rounded-full bg-[#4B73F8] py-3 text-sm font-bold text-white transition-all hover:bg-[#345ee8] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isTracking ? 'Agregando...' : 'Seguir precio'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default CurrentPageProductCard;
