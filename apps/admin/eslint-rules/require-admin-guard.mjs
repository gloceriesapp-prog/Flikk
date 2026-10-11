// ESLint rule: every HTTP handler exported from src/app/api/**/route.ts must
// begin with the shared admin guard (src/lib/auth/requireAdmin.ts):
//
//   const { denied } = await requireAdmin();   // or { actor, denied }
//   if (denied) return denied;
//
// so a new route can't ship relying on middleware.ts alone. Runs as part of
// `npx eslint src`. Routes that must be reachable without an admin session
// are listed in PUBLIC_ROUTES with the reason.

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

// Path suffix (relative to src/app/api) -> why it is public.
export const PUBLIC_ROUTES = {
  // Emails the sign-in code — the start of login, so no session exists yet.
  // Throttled server-side (claim_auth_budget) and only ever emails the one
  // configured admin address.
  'auth/otp/send/route.ts': 'OTP send endpoint (starts sign-in, before any session exists)',
  // Verifies the emailed code and, only on success, sets the admin session
  // cookie. Rate-limited single-use codes; nothing else is exposed.
  'auth/otp/verify/route.ts': 'OTP verify endpoint (performs sign-in, before any session exists)',
  // Only clears the caller's own session cookie; touches no data.
  'auth/logout/route.ts': 'sign-out endpoint (clears the caller\'s own session only)',
};

function apiRelativePath(filename) {
  const normalized = filename.replace(/\\/g, '/');
  const marker = '/src/app/api/';
  const index = normalized.lastIndexOf(marker);
  return index === -1 ? null : normalized.slice(index + marker.length);
}

function isGuardCall(statement) {
  if (statement?.type !== 'VariableDeclaration' || statement.declarations.length !== 1) return false;
  const [declaration] = statement.declarations;
  const init = declaration.init;
  if (init?.type !== 'AwaitExpression') return false;
  const call = init.argument;
  if (call?.type !== 'CallExpression' || call.callee.type !== 'Identifier' || call.callee.name !== 'requireAdmin') return false;
  if (declaration.id.type !== 'ObjectPattern') return false;
  return declaration.id.properties.some(
    (property) => property.type === 'Property' && property.key.type === 'Identifier' && property.key.name === 'denied' && property.value.type === 'Identifier' && property.value.name === 'denied',
  );
}

function isDeniedReturn(statement) {
  if (statement?.type !== 'IfStatement' || statement.alternate) return false;
  if (statement.test.type !== 'Identifier' || statement.test.name !== 'denied') return false;
  const consequent = statement.consequent.type === 'BlockStatement' && statement.consequent.body.length === 1 ? statement.consequent.body[0] : statement.consequent;
  return consequent.type === 'ReturnStatement' && consequent.argument?.type === 'Identifier' && consequent.argument.name === 'denied';
}

const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'Admin API route handlers must call requireAdmin() first.' },
    schema: [],
    messages: {
      missing: "Exported {{method}} handler must import requireAdmin from '@/lib/auth/requireAdmin' and start with `const { denied } = await requireAdmin(); if (denied) return denied;` (src/lib/auth/requireAdmin.ts). If this route is genuinely public, add it to PUBLIC_ROUTES in eslint-rules/require-admin-guard.mjs with a reason.",
      unsupported: 'Export {{method}} as `export async function {{method}}(...)` so the admin guard check can verify it.',
    },
  },
  create(context) {
    const rel = apiRelativePath(context.filename ?? context.getFilename());
    if (!rel || !/(^|\/)route\.tsx?$/.test(rel) || Object.hasOwn(PUBLIC_ROUTES, rel)) return {};

    let importsGuard = false;
    return {
      ImportDeclaration(node) {
        if (node.source.value !== '@/lib/auth/requireAdmin') return;
        if (node.specifiers.some((s) => s.type === 'ImportSpecifier' && s.imported.name === 'requireAdmin' && s.local.name === 'requireAdmin')) importsGuard = true;
      },
      ExportNamedDeclaration(node) {
        const declaration = node.declaration;
        if (declaration?.type === 'FunctionDeclaration' && declaration.id && HTTP_METHODS.has(declaration.id.name)) {
          const [first, second] = declaration.body.body;
          if (!importsGuard || !isGuardCall(first) || !isDeniedReturn(second)) {
            context.report({ node: declaration.id, messageId: 'missing', data: { method: declaration.id.name } });
          }
          return;
        }
        if (declaration?.type === 'VariableDeclaration') {
          for (const item of declaration.declarations) {
            if (item.id.type === 'Identifier' && HTTP_METHODS.has(item.id.name)) {
              context.report({ node: item.id, messageId: 'unsupported', data: { method: item.id.name } });
            }
          }
          return;
        }
        for (const specifier of node.specifiers ?? []) {
          const name = specifier.exported.type === 'Identifier' ? specifier.exported.name : specifier.exported.value;
          if (HTTP_METHODS.has(name)) context.report({ node: specifier, messageId: 'unsupported', data: { method: name } });
        }
      },
      ExportDefaultDeclaration(node) {
        context.report({ node, messageId: 'unsupported', data: { method: 'default' } });
      },
      ExportAllDeclaration(node) {
        context.report({ node, messageId: 'unsupported', data: { method: '*' } });
      },
    };
  },
};

export default {
  meta: { name: 'admin-guard' },
  rules: { 'require-admin-guard': rule },
};
