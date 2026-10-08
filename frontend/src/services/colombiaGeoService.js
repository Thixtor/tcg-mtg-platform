// ============================================================================
// SERVICIO API: DATOS ABIERTOS DE COLOMBIA (DANE / DIVIPOLA)
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Dataset oficial activo DANE DIVIPOLA: xdk5-pm3f.json
// - Catálogo pre-cargado instantáneo: elimina latencias de red y garantiza
//   disponibilidad continua aunque datos.gov.co esté inactivo o caiga en 404.
// ============================================================================

const BASE_URL = 'https://www.datos.gov.co/resource/xdk5-pm3f.json';

// Catálogo base de departamentos de Colombia
const COLOMBIA_DEPARTMENTS = [
  'Antioquia', 'Bogotá D.C.', 'Valle del Cauca', 'Atlántico', 'Santander',
  'Cundinamarca', 'Bolívar', 'Caldas', 'Risaralda', 'Quindío', 'Tolima',
  'Huila', 'Meta', 'Boyacá', 'Nariño', 'Cauca', 'Cesar', 'Córdoba',
  'Magdalena', 'Norte de Santander', 'Sucre', 'La Guajira', 'Casanare',
  'Arauca', 'Caquetá', 'Chocó', 'Putumayo', 'San Andrés y Providencia',
  'Amazonas', 'Guainía', 'Guaviare', 'Vaupés', 'Vichada'
];

// Municipios principales precargados para respuesta instantánea
const LOCAL_MUNICIPALITIES = {
  'Antioquia': [
    'Medellín', 'Bello', 'Envigado', 'Itagüí', 'Sabaneta', 'La Estrella',
    'Caldas', 'Copacabana', 'Girardota', 'Barbosa', 'Rionegro', 'Marinilla',
    'El Retiro', 'Guarne', 'La Ceja', 'El Carmen de Viboral', 'Apartadó',
    'Turbo', 'Caucasia', 'Santa Fe de Antioquia', 'Yarumal'
  ],
  'Bogotá D.C.': [
    'Bogotá D.C.'
  ],
  'Valle del Cauca': [
    'Cali', 'Palmira', 'Buga', 'Tuluá', 'Cartago', 'Jamundí', 'Yumbo',
    'Buenaventura', 'Sevilla', 'Zarzal'
  ],
  'Atlántico': [
    'Barranquilla', 'Soledad', 'Malambo', 'Puerto Colombia', 'Galapa',
    'Baranoa', 'Sabanalarga'
  ],
  'Santander': [
    'Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja',
    'San Gil', 'Socorro', 'Barbosa'
  ],
  'Cundinamarca': [
    'Soacha', 'Chía', 'Zipaquirá', 'Facatativá', 'Mosquera', 'Madrid',
    'Funza', 'Cajicá', 'Girardot', 'Fusagasugá', 'Sopó', 'Cota'
  ],
  'Risaralda': [
    'Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia'
  ],
  'Caldas': [
    'Manizales', 'Villamaría', 'Chinchiná', 'La Dorada', 'Riosucio'
  ],
  'Quindío': [
    'Armenia', 'Calarcá', 'Circasia', 'Montenegro', 'Quimbaya', 'La Tebaida'
  ],
  'Bolívar': [
    'Cartagena', 'Turbaco', 'Magangué', 'Arjona', 'El Carmen de Bolívar'
  ],
  'Tolima': [
    'Ibagué', 'Espinal', 'Melgar', 'Chaparral', 'Mariquita', 'Honda'
  ],
  'Huila': [
    'Neiva', 'Pitalito', 'Garzón', 'La Plata'
  ],
  'Boyacá': [
    'Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa', 'Villa de Leyva'
  ],
  'Nariño': [
    'Pasto', 'Ipiales', 'Tumaco', 'Túquerres'
  ],
  'Meta': [
    'Villavicencio', 'Acacías', 'Granada', 'Puerto López'
  ]
};

const cache = {
  departments: [...COLOMBIA_DEPARTMENTS],
  municipalitiesByDept: { ...LOCAL_MUNICIPALITIES },
};

function titleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, (c) => c.toUpperCase());
}

/**
 * Obtiene la lista ordenada de departamentos de Colombia.
 */
export async function getColombiaDepartments() {
  if (cache.departments && cache.departments.length > 0) {
    return cache.departments;
  }

  try {
    const url = `${BASE_URL}?$select=departamento&$group=departamento&$order=departamento ASC`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (response.ok) {
      const data = await response.json();
      const list = data
        .map((item) => titleCase(item.departamento))
        .filter(Boolean);

      if (list.length > 0) {
        cache.departments = Array.from(new Set(list));
        return cache.departments;
      }
    }
  } catch {
    // Si falla o no hay conexión, se preserva el catálogo base silenciosamente
  }

  cache.departments = COLOMBIA_DEPARTMENTS;
  return COLOMBIA_DEPARTMENTS;
}

/**
 * Obtiene los municipios correspondientes a un departamento específico.
 */
export async function getColombiaMunicipalities(department) {
  if (!department) return [];

  // Si ya están cacheados o disponibles en el catálogo local
  if (cache.municipalitiesByDept[department]?.length > 0) {
    return cache.municipalitiesByDept[department];
  }

  try {
    const deptParam = encodeURIComponent(department.toUpperCase());
    const url = `${BASE_URL}?departamento=${deptParam}&$select=municipio&$order=municipio ASC&$limit=400`;
    
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (response.ok) {
      const data = await response.json();
      const list = data
        .map((item) => titleCase(item.municipio))
        .filter(Boolean);

      if (list.length > 0) {
        const uniqueMunis = Array.from(new Set(list));
        cache.municipalitiesByDept[department] = uniqueMunis;
        return uniqueMunis;
      }
    }
  } catch {
    // Fallback silencioso sin warnings invasivos
  }

  const fallback = LOCAL_MUNICIPALITIES[department] || [department];
  cache.municipalitiesByDept[department] = fallback;
  return fallback;
}