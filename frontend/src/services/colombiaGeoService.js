// ---------------------------------------------------------
// SERVICIO API: DATOS ABIERTOS DE COLOMBIA (DANE / DIVIPOLA)
// ---------------------------------------------------------

const BASE_URL = 'https://www.datos.gov.co/resource/gd35-4vgq.json';

// Fallback local garantizado para las regiones principales
const LOCAL_FALLBACK = {
  'Antioquia': [
    'Medellín', 'Bello', 'Envigado', 'Itagüí', 'Sabaneta', 'La Estrella',
    'Caldas', 'Copacabana', 'Girardota', 'Rionegro', 'Marinilla', 'El Retiro',
    'Guarne', 'La Ceja', 'Apartadó', 'Turbo', 'Caucasia'
  ],
  'Bogotá D.C.': [
    'Bogotá D.C.'
  ],
  'Valle del Cauca': [
    'Cali', 'Palmira', 'Buga', 'Tuluá', 'Cartago', 'Jamundí', 'Yumbo', 'Buenaventura'
  ],
  'Atlántico': [
    'Barranquilla', 'Soledad', 'Malambo', 'Puerto Colombia', 'Galapa'
  ],
  'Santander': [
    'Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil'
  ],
  'Cundinamarca': [
    'Soacha', 'Chía', 'Zipaquirá', 'Facatativá', 'Mosquera', 'Madrid', 'Funza', 'Cajicá'
  ],
  'Risaralda': [
    'Pereira', 'Dosquebradas', 'Santa Rosa de Cabal'
  ],
  'Caldas': [
    'Manizales', 'Villamaría', 'Chinchiná', 'La Dorada'
  ],
  'Quindío': [
    'Armenia', 'Calarcá', 'Circasia', 'Montenegro'
  ],
  'Bolívar': [
    'Cartagena', 'Turbaco', 'Magangué'
  ]
};

const cache = {
  departments: null,
  municipalitiesByDept: {},
};

// Formatea texto en estilo Capitalize ("MEDELLÍN" -> "Medellín")
function titleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, (c) => c.toUpperCase());
}

/**
 * Obtiene la lista única de departamentos de Colombia.
 */
export async function getColombiaDepartments() {
  if (cache.departments && cache.departments.length > 0) {
    return cache.departments;
  }

  try {
    const url = `${BASE_URL}?$select=departamento&$group=departamento&$order=departamento ASC`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error al consultar departamentos');
    
    const data = await response.json();
    const list = data
      .map((item) => titleCase(item.departamento))
      .filter(Boolean);

    // Si la API devolvió registros válidos
    if (list.length > 0) {
      cache.departments = Array.from(new Set(list));
      return cache.departments;
    }
  } catch (error) {
    console.warn('Fallo en API DANE, aplicando catálogo base de departamentos:', error);
  }

  const fallbackDepts = [
    'Antioquia', 'Bogotá D.C.', 'Valle del Cauca', 'Atlántico', 'Santander',
    'Cundinamarca', 'Bolívar', 'Caldas', 'Risaralda', 'Quindío', 'Tolima',
    'Huila', 'Meta', 'Boyacá', 'Nariño', 'Cauca', 'Cesar', 'Córdoba',
    'Magdalena', 'Norte de Santander', 'Sucre', 'La Guajira', 'Casanare'
  ];
  cache.departments = fallbackDepts;
  return fallbackDepts;
}

/**
 * Obtiene los municipios correspondientes a un departamento específico.
 */
export async function getColombiaMunicipalities(department) {
  if (!department) return [];

  if (cache.municipalitiesByDept[department]?.length > 0) {
    return cache.municipalitiesByDept[department];
  }

  try {
    // La API DANE almacena los departamentos en mayúsculas sostenidas
    const deptUpper = encodeURIComponent(department.toUpperCase());
    const url = `${BASE_URL}?departamento=${deptUpper}&$select=municipio&$order=municipio ASC&$limit=300`;
    
    const response = await fetch(url);
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
  } catch (error) {
    console.warn(`Fallo al cargar municipios remotos de ${department}:`, error);
  }

  // Fallback local si el departamento coincide con el catálogo precargado
  const localList = LOCAL_FALLBACK[department] || [department];
  cache.municipalitiesByDept[department] = localList;
  return localList;
}