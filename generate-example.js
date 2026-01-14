import 'dotenv/config'
import { getFullBlockChildren, updateExampleToNotion, getDatabaseRows } from './shared.js'

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
      const databases = content.filter((b) => b.type === 'child_database')

      for (const db of databases) {
        const pages = await getDatabaseRows(db.id)
        if (pages.length === 0) continue

        for (const row of pages) {
          await updateExampleToNotion({ row, forceUpdate: true })
        }
      }
    }

    console.log(`\n✨ SUCCESS: ${allCards.length} cards exported.`)
  } catch (err) {
    console.error('Fatal Error:', err)
  }
}

main()
