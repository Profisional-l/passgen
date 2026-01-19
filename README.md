# Crypt Keeper (личный zero‑knowledge менеджер паролей)

## Dev

```bash
npm install
npm run dev
```

## Prod build

```bash
npm run build
npm start
```

## Бэкапы / восстановление

Смотри `docs/DR.md`.

### Сделать бэкап SQLite

```bash
npm run db:backup
```

### Восстановить SQLite из бэкапа

```bash
npm run db:restore -- backups/vault-<timestamp>.db
```
