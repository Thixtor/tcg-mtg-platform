# MTG Card Market & Analytics Platform

Aplicación web Full Stack para la consulta, gestión de inventario, analítica de mercado y construcción de mazos de *Magic: The Gathering* (MTG). La plataforma integra los datos masivos provistos por la API oficial de Scryfall en una base de datos local para realizar consultas de alto rendimiento sin penalizaciones por límites de peticiones.

---

## 🛠️ Stack Tecnológico

- **Backend:** FastAPI (Python 3.10+) con Uvicorn para una arquitectura asíncrona, modular y documentación OpenAPI automática.
- **Base de Datos:** PostgreSQL en contenedor Docker, configurado con soporte para campos relacionales indexados y columnas `JSONB` (`scryfall_raw_data`) para almacenar el payload completo de las cartas sin pérdida de datos.
- **ORM & Configuración:** SQLAlchemy para el mapeo objeto-relacional, `psycopg2-binary` como driver de conexión y `python-dotenv` para la gestión segura de variables de entorno.
- **ETL & Datos Masivos:** Pipeline en Python que procesa volcados masivos en formato JSONL comprimido (`.jsonl.gz`) desde el endpoint `/bulk-data` de Scryfall, descomprimiendo en streaming en memoria (`gzip` + `json`).
- **Frontend (Próxima Fase):** React con Vite.
- **Contenerización:** Docker para aislamiento del motor de base de datos y orquestación integral con Docker Compose.

---

## 📁 Estructura del Proyecto

```text
mi-proyecto-tcg/
├── README.md
├── docker-compose.yml           # Orquestación de servicios en producción (en desarrollo)
├── backend/
│   ├── .env                     # Variables de entorno locales (ignorado en git)
│   ├── .gitignore               # Exclusiones de Git (.env, caches, entornos virtuales)
│   ├── requirements.txt         # Dependencias Python
│   ├── app/
│   │   ├── __init__.py
│   │   ├── database.py          # Conexión SQLAlchemy, sesión y lectura de .env
│   │   ├── models.py            # Modelos ORM (Card con soporte JSONB)
│   │   └── main.py              # Aplicación FastAPI y definición de endpoints
│   └── scripts/
│       ├── __init__.py
│       └── ingest_scryfall.py   # Script ETL para descarga y carga de Bulk Data Scryfall
└── frontend/                    # Cliente web en React (fase futura)

