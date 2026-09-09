# Triada

Presupuesto anual personal con la regla 50/30/20: repartir los ingresos entre
necesidades (50 %), deseos (30 %) y ahorro (20 %), y seguir cómo va cada mes.
Los datos se guardan solo en tu dispositivo —sin cuentas, sin servidor—. PWA
instalable que funciona sin conexión, en el móvil o en el escritorio.

Demo: <https://triada-tcp.netlify.app>

## Características

- Regla 50/30/20 con reparto configurable por año
- Seguimiento mensual de gastos, con categorías propias y gastos recurrentes
- Resumen anual: reparto, gasto por mes y categorías destacadas
- Copia de seguridad: exporta e importa todos tus datos como JSON
- PWA instalable y offline-first (service worker + manifest)
- Español e inglés; euro o dólar

Construido con Vue 3 + TypeScript + Vite + Pinia + PrimeVue.

Notas de arquitectura y convenciones en [`AGENTS.md`](./AGENTS.md).

## Desarrollo

Requiere Node ≥ 24.19.0 y pnpm.

```bash
pnpm install
pnpm dev
```

```bash
pnpm test:unit     # unitarios e integración (Vitest)
pnpm test:e2e      # end-to-end (Cypress)
pnpm build         # build de producción
pnpm build:check   # formato + cobertura + tipos + lint
```

## Despliegue

Sitio estático en [Netlify](https://www.netlify.com/): detecta el build de Vite y
`public/_redirects` reenvía todas las rutas a `index.html`. Cada push a `main`
publica producción; los pull requests generan una preview.

## Licencia

MIT — ver [`LICENSE`](./LICENSE).
