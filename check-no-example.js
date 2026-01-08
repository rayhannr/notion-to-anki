import 'dotenv/config'
import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_API_KEY })
const parentPageId = process.env.NOTION_PAGE_ID

async function getFullBlockChildren(blockId) {
  let allResults = []
  let cursor = undefined
  while (true) {
    const response = await notion.blocks.children.list({ block_id: blockId, start_cursor: cursor })
    allResults.push(...response.results)
    if (!response.has_more) break
    cursor = response.next_cursor
  }
  return allResults
}

async function auditToggles() {
  try {
    console.log('--- 🔍 MEMULAI AUDIT TOGGLE LIST ---')
    const subpages = await getFullBlockChildren(parentPageId)

    let pagesWithToggles = 0

    for (const page of subpages) {
      if (page.type !== 'child_page' || page.child_page?.title === 'notes') continue

      const content = await getFullBlockChildren(page.id)

      // Notion punya beberapa tipe toggle: 'toggle', 'heading_1_toggle', dll.
      const toggles = content.filter((b) => b.type === 'toggle' || b.type.includes('_toggle'))

      if (toggles.length > 0) {
        console.log(`❌ Halaman: "${page.child_page.title}"`)
        console.log(`   Ditemukan ${toggles.length} blok Toggle.`)

        // Kasih intip dikit isi togglenya biar gampang nyarinya
        toggles.forEach((t, i) => {
          const text = t[t.type].rich_text.map((rt) => rt.plain_text).join('')
          console.log(`     ${i + 1}. "${text || '(Toggle Kosong)'}"`)
        })
        console.log('---')
        pagesWithToggles++
      }
    }

    if (pagesWithToggles === 0) {
      console.log('✅ BERSIH: Gak ada Toggle List. Semua data aman di dalam tabel/paragraf.')
    } else {
      console.log(`⚠️ SELESAI: Ada ${pagesWithToggles} halaman yang masih punya Toggle.`)
      console.log('Saran: Pindahin isi toggle itu ke dalam tabel biar bisa diproses Gemini & Anki.')
    }
  } catch (err) {
    console.error('Error saat audit toggle:', err.message)
  }
}

auditToggles()
