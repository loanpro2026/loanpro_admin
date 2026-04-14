const baseUrl = (process.env.ADMIN_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const bypassKey = String(process.env.ADMIN_DEV_BYPASS_KEY || '').trim();
const runMutations = String(process.env.ADMIN_RUN_MUTATION_TESTS || '0').trim() === '1';

if (!bypassKey) {
  console.error('Missing ADMIN_DEV_BYPASS_KEY in environment.');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'x-admin-dev-bypass-key': bypassKey,
};

async function request(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    method,
    path,
    json,
  };
}

function printResult(result) {
  const state = result.ok ? 'OK' : 'FAIL';
  console.log(`${state} ${result.status} ${result.method} ${result.path}`);
  if (!result.ok) {
    console.log(JSON.stringify(result.json, null, 2));
  }
}

async function main() {
  const checks = [];

  checks.push(await request('GET', '/api/health'));
  checks.push(await request('POST', '/api/admin/init'));
  checks.push(await request('GET', '/api/auth/me'));
  checks.push(await request('GET', '/api/roles'));
  checks.push(await request('GET', '/api/team'));
  checks.push(await request('GET', '/api/audit-logs?limit=20'));

  for (const result of checks) {
    printResult(result);
  }

  if (runMutations) {
    const roleKey = `ops_test_${Date.now()}`;
    const createRole = await request('POST', '/api/roles', {
      key: roleKey,
      name: 'Ops Test Role',
      description: 'Temporary role for local API mutation smoke test',
      permissions: ['users:read', 'team:read'],
    });
    printResult(createRole);

    if (createRole.ok) {
      const patchRole = await request('PATCH', `/api/roles/${encodeURIComponent(roleKey)}`, {
        description: 'Updated during local smoke test',
        permissions: ['users:read', 'team:read', 'audit:read'],
        reason: 'Local mutation smoke test',
      });
      printResult(patchRole);
    }
  }

  const failed = checks.some((result) => !result.ok);
  if (failed) {
    process.exit(1);
  }

  console.log('Core API smoke checks completed successfully.');
}

main().catch((error) => {
  console.error('Smoke test failed:', error);
  process.exit(1);
});
