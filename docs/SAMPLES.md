# Adding SDK Samples

## Quick Scaffold

```bash
pnpm scaffold <id> --name "Display Name" --description "What it does" --connectors github
```

## Manual Steps

1. Create `samples/<name>/sdk/index.ts`
2. Use shared utilities from `shared/`
3. Add npm script to `package.json`
4. Add tests in `test/samples/<name>/`
5. Update `samples/catalog.json` and `frontend/public/catalog.json`

## Sample Structure

Each sample should have:

```
samples/<name>/
└── sdk/
    ├── index.ts      # Entry point (exports run() function)
    ├── <service>.ts  # Main service implementation
    └── README.md     # Sample-specific docs
```

## Testing

- Place tests in `test/samples/<name>/`
- Use `expectSuccess()` and `expectFailure()` helpers
- Mock connectors are available for all samples
