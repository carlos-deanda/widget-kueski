export const TIENDAS_AFILIADAS = [
  { nombre: 'Amazon México', dominio: 'amazon.com.mx' },
  { nombre: 'SHEIN', dominio: 'shein.com.mx' },
  { nombre: 'Temu', dominio: 'temu.com' },
  { nombre: 'Innovasport', dominio: 'innovasport.com' },
  { nombre: "Levi's", dominio: 'levi.com.mx' },
  { nombre: 'Adidas', dominio: 'adidas.mx' },
  { nombre: 'Samsung', dominio: 'samsung.com.mx' },
  { nombre: 'Puma', dominio: 'mx.puma.com' },
  { nombre: 'Steve Madden', dominio: 'stevemadden.com.mx' },
  { nombre: 'Innvictus', dominio: 'innvictus.com' },
];

export function obtenerTiendaAfiliada(hostname) {
  if (!hostname) {
    return null;
  }

  const hostnameNormalizado = hostname.toLowerCase();

  return TIENDAS_AFILIADAS.find((tienda) => (
    hostnameNormalizado.includes(tienda.dominio.toLowerCase())
  )) || null;
}
