import 'dotenv/config'
import { generateExample, getFullBlockChildren, updateExampleToNotion } from './shared.js'

const parentPageId = process.env.NOTION_PAGE_ID

/**
 * MAIN EXECUTION
 */
async function main() {
  let allCards = []

  try {
    console.log('--- 🚀 STARTING FULL EVALUATION ---')
    const subpages = await getFullBlockChildren(parentPageId)

    for (const page of subpages) {
      if (page.type !== 'child_page' || page.child_page?.title === 'notes') continue
      const pageTitle = page.child_page.title

      console.log(`\n📄 Processing Page: ${pageTitle}`)
      const content = await getFullBlockChildren(page.id)
      const tables = content.filter((b) => b.type === 'table')

      for (const table of tables) {
        const rows = await getFullBlockChildren(table.id)
        const tableRows = rows.filter((r) => r.type === 'table_row')
        if (tableRows.length < 2) continue

        const originalHeaders = tableRows[0].table_row.cells.map((c) => c.map((n) => n.plain_text).join(''))
        const headLower = originalHeaders.map((h) => h.toLowerCase())

        const kIdx = headLower.findIndex((h) => h.includes('kanji') || h.includes('front') || h === 'word')
        const rIdx = headLower.findIndex((h) => h.includes('romaji') || h.includes('reading'))
        const mIdx = headLower.findIndex((h) => h.includes('meaning') || h.includes('english'))
        const eIdx = headLower.findIndex((h) => h.includes('example'))

        if (kIdx === -1 || eIdx === -1) continue

        const bodyRows = tableRows.slice(1)
        for (const row of bodyRows) {
          updateExampleToNotion({ row, kIdx, rIdx, mIdx, eIdx, forceUpdate: true })
        }
      }
    }

    console.log(`\n✨ SUCCESS: ${allCards.length} cards exported.`)
  } catch (err) {
    console.error('Fatal Error:', err)
  }
}

main()
