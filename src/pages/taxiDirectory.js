import { listApprovedCompaniesDirectory } from '../lib/api.js'
import { absolutePublicBookingUrl } from '../lib/tenant.js'
import { escapeHtml } from '../lib/html.js'
import { icon } from '../lib/icons.js'

export async function mountTaxiDirectory(root) {
  root.innerHTML = `
    <div class="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-12">
      <div class="mx-auto max-w-2xl text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 shadow-md">
          ${icon.search('h-6 w-6 text-gray-900')}
        </div>
        <p class="text-sm text-gray-500">Loading companies…</p>
      </div>
    </div>`

  let companies = []
  try {
    companies = await listApprovedCompaniesDirectory()
  } catch (e) {
    console.error(e)
    companies = []
  }

  const rows =
    companies.length === 0
      ? `<p class="py-12 text-center text-sm text-gray-500">No approved taxi companies are listed yet. Check back soon.</p>`
      : `<ul class="divide-y divide-gray-100">
          ${companies
            .map((c) => {
              const loc = [c.city, c.country].filter(Boolean).join(', ') || '—'
              const bookUrl = absolutePublicBookingUrl(c.slug)
              return `<li class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0 text-left">
                  <p class="font-bold text-gray-900">${escapeHtml(c.name)}</p>
                  <p class="mt-0.5 text-sm text-gray-500">${escapeHtml(loc)}</p>
                </div>
                <a href="${escapeHtml(bookUrl)}" class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-gray-900 shadow-sm hover:bg-yellow-500">
                  ${icon.car('h-4 w-4')}
                  Book / contact
                </a>
              </li>`
            })
            .join('')}
        </ul>`

  root.innerHTML = `
    <div class="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10 pb-16">
      <div class="mx-auto max-w-lg">
        <a href="/" class="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          ${icon.arrowLeft('h-4 w-4')}
          Back to home
        </a>
        <div class="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <h1 class="text-2xl font-black text-gray-900">Find a taxi company</h1>
          <p class="mt-2 text-sm text-gray-600">Browse registered TAXIO companies and open their booking page.</p>
          <div class="mt-6">${rows}</div>
        </div>
      </div>
    </div>`
}
