# Frontend React

## Estructura

- `src/api`: funciones de integración con APIs
- `src/services`: orquestación de llamadas para casos de uso
- `src/pages` y `src/components`: capa visual
- `src/routes`: enrutamiento y montaje por ruta

## Variables de entorno

1. Copia `.env.example` a `.env`
2. Ajusta:
   - `VITE_WEBHOOK_API_URL`
   - `VITE_PYTHON_API_URL`

## Ejecución

```bash
npm install
npm run dev
```
