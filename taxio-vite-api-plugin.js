/**
 * Runs /api/* server handlers inside `vite dev` so registration & admin approval work locally.
 * Loads env from .env / .env.local (via Vite loadEnv + merge) for Node handlers.
 * Production (Vercel) uses real serverless routes — this plugin applies only in dev (`apply: 'serve'`).
 */
import { readFileSync } from 'node:fs'
import { resolve as pathResolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadEnv } from 'vite'

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function mergeEnvFromFiles(root, mode) {
  const names = ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`]
  for (const name of names) {
    try {
      const p = pathResolve(root, name)
      const raw = readFileSync(p, 'utf8')
      for (const line of raw.split('\n')) {
        const t = line.trim()
        if (!t || t.startsWith('#')) continue
        const eq = t.indexOf('=')
        if (eq < 1) continue
        const key = t.slice(0, eq).trim()
        let val = t.slice(eq + 1).trim()
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1)
        }
        if (key && val !== '' && process.env[key] == null) process.env[key] = val
      }
    } catch {
      /* file missing */
    }
  }
}

export function taxioApiPlugin() {
  return {
    name: 'taxio-api-local-dev',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root || process.cwd()
      const mode = server.config.mode || 'development'

      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url || '').split('?')[0]
        if (!pathname.startsWith('/api/')) return next()

        if (!globalThis.__taxioDevEnvLoaded) {
          globalThis.__taxioDevEnvLoaded = true
          const fromVite = loadEnv(mode, root, '')
          for (const [k, v] of Object.entries(fromVite)) {
            if (v !== '' && v != null) process.env[k] = v
          }
          mergeEnvFromFiles(root, mode)
        }

        if (req.method === 'OPTIONS' && pathname !== '/api/estimate-route') {
          res.statusCode = 204
          return res.end()
        }

        const routes = {
          '/api/register-company': 'api/register-company.js',
          '/api/public-booking': 'api/public-booking.js',
          '/api/admin-approve-company': 'api/admin-approve-company.js',
          '/api/admin-delete-company': 'api/admin-delete-company.js',
          '/api/admin-dev-cleanup-test-companies': 'api/admin-dev-cleanup-test-companies.js',
          '/api/admin-send-communication-email': 'api/admin-send-communication-email.js',
          '/api/estimate-route': 'api/estimate-route.js',
        }
        const file = routes[pathname]
        const isEstimateRoute = pathname === '/api/estimate-route'
        if (
          !file ||
          (req.method !== 'POST' && !(isEstimateRoute && req.method === 'OPTIONS'))
        ) {
          return next()
        }

        const abs = pathResolve(root, file)
        const href = pathToFileURL(abs).href

        try {
          const raw = await readRequestBody(req)
          let parsed = {}
          if (raw) {
            try {
              parsed = JSON.parse(raw)
            } catch {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Invalid JSON body.' }))
              return
            }
          }

          const hdr = req.headers || {}
          const fakeReq = {
            method: 'POST',
            url: req.url,
            headers: {
              ...hdr,
              authorization: hdr.authorization || hdr.Authorization,
              origin: hdr.origin || hdr.Origin,
              'x-forwarded-proto': hdr['x-forwarded-proto'],
              'x-forwarded-host': hdr['x-forwarded-host'],
            },
            body: parsed,
          }

          const mod = await import(href)
          await mod.default(fakeReq, res)
        } catch (e) {
          if (res.writableEnded) return
          console.error('[taxio-vite-api]', e)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error:
                e?.message ||
                'Local API error. Check server logs and that SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are set in .env',
            })
          )
        }
      })
    },
  }
}
