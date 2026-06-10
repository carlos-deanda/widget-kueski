import { useState, useEffect } from 'react';
import { searchMercadoLibre, searchElektra } from '../api.js';

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


  const [comparisons, setComparisons] = useState([]);
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    if (!product?.name) {
      setComparisons([]);
      return;
    }

    let isMounted = true;
    setIsComparing(true);
    setComparisons([]);

    Promise.allSettled([
      searchMercadoLibre(product.name),
      searchElektra(product.name)
    ]).then((results) => {
      if (!isMounted) return;
      const successfulComparisons = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);
      setComparisons(successfulComparisons);
      setIsComparing(false);
    }).catch(() => {
      if (isMounted) {
        setIsComparing(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [product?.name]);

  const handleOpenUrl = (url) => {
    if (!url) return;
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

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


      {/* Comparativa con otras tiendas */}
      {product && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="mb-2 text-xs font-bold uppercase text-[#6B7280]">Comparar con otras tiendas</p>
          {isComparing ? (
            <div className="flex items-center gap-2 py-2 text-xs font-medium text-[#6B7280]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
              </span>
              Buscando en otras tiendas...
            </div>
          ) : comparisons.length > 0 ? (
            <div className="space-y-2.5">
              {comparisons.map((comp, idx) => {
                const diff = pagePrice - comp.price;
                const isCheaper = diff > 0;
                const isMoreExpensive = diff < 0;
                const priceDiffAbs = Math.abs(diff);
                
                return (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between rounded-2xl border p-3.5 transition-all hover:bg-gray-50 ${isCheaper ? 'border-green-200 bg-green-50/20' : isMoreExpensive ? 'border-red-200 bg-red-50/20' : 'border-gray-200 bg-white'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black uppercase text-[#20212A]">
                          {comp.store}
                        </span>
                        {isCheaper && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-black uppercase text-[#16A34A]">
                            Ahorras ${priceDiffAbs.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                          </span>
                        )}
                        {isMoreExpensive && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-black uppercase text-[#EF4444]">
                            +${priceDiffAbs.toLocaleString('es-MX', { maximumFractionDigits: 2 })} más caro
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[10px] font-medium text-[#6B7280]" title={comp.name}>
                        {comp.name}
                      </p>
                      <p className="mt-1 text-sm font-black text-[#20212A]">
                        ${comp.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleOpenUrl(comp.url)}
                      className="ml-3 shrink-0 rounded-full bg-gray-100 px-3.5 py-1.5 text-xs font-black text-[#20212A] transition-all hover:bg-gray-200 active:scale-[0.96]"
                    >
                      Ir a tienda
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-1 text-xs font-medium text-[#6B7280]">
              No se encontraron ofertas similares en otras tiendas.
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
