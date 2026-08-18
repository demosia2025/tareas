-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear schema para la aplicación
CREATE SCHEMA IF NOT EXISTS app;

-- Configurar búsqueda de paths
ALTER DATABASE project_management SET search_path TO app, public;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE project_management TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA app TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app TO postgres;