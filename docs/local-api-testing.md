# Local API Testing

This guide lets you test admin backend APIs locally before building additional modules.

## 1) Configure local env
Create `.env.local` in `loanpro_admin_next` with at least:

```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
MONGODB_URI=your_mongodb_uri
MONGODB_DB_NAME=AdminDB
ADMIN_DEV_BYPASS_KEY=replace_with_strong_local_key
ADMIN_INIT_SECRET=replace_with_init_secret
```

Clerk keys are optional for local API tests when using `ADMIN_DEV_BYPASS_KEY`.

## 2) Start dev server
```powershell
Set-Location "C:\Users\jaksh\OneDrive\Desktop\web_loanpro\loanpro_admin_next"
npm run dev
```

## 3) Run smoke test script
```powershell
$env:ADMIN_DEV_BYPASS_KEY="replace_with_strong_local_key"
$env:ADMIN_API_BASE_URL="http://localhost:3000"
npm run test:apis
```

Optional mutation tests:
```powershell
$env:ADMIN_RUN_MUTATION_TESTS="1"
npm run test:apis
```

## 4) Manual endpoint checks (PowerShell)
```powershell
$h = @{ "x-admin-dev-bypass-key" = "replace_with_strong_local_key" }
Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/health" -Headers $h
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/admin/init" -Headers $h
Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/auth/me" -Headers $h
Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/roles" -Headers $h
Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/team" -Headers $h
Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/audit-logs?limit=20" -Headers $h
Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/integrations/health" -Headers $h
Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/integrations/usage" -Headers $h
```

## 5) First admin bootstrap verification (production-like flow)
1. Set `ADMIN_BOOTSTRAP_EMAIL` or `ADMIN_BOOTSTRAP_CLERK_USER_ID` in env.
2. Sign in as that Clerk user.
3. Call `GET /api/auth/me` and verify role is `super_admin`.
4. Open Team page and invite one member with required reason.

## Security note
`ADMIN_DEV_BYPASS_KEY` is development-only and disabled automatically when `NODE_ENV=production`.
Never configure this key in production environments.
