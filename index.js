import 'dotenv/config'
import { createArrayCsvWriter as createCsvWriter } from 'csv-writer'
import pkg from 'anki-apkg-export'
const AnkiExport = pkg.default || pkg
import fs from 'fs'
import { getFullBlockChildren, updateExampleToNotion } from './shared.js'

const parentPageId = process.env.NOTION_PAGE_ID

async function generateAnkiPkg(cards) {
  console.log('\n📦 Packaging into .apkg...')
  const apkg = new AnkiExport('Notion to Anki • Advanced Japanese N4', {
    css: `
    .card { 
      font-family: "Helvetica", "Arial", sans-serif; 
      font-size: 20px; 
      text-align: center; 
    }
    .kanji { 
      font-size: 45px; 
      margin-bottom: 20px; 
    }
    .back-container { 
      text-align: left; 
      display: inline-block; 
      width: 90%; 
      margin-top: 10px; 
      border-top: 1px solid #ccc; 
      padding-top: 10px; 
    }
  `
  })

  cards.forEach((card) => {
    // card[0] = Front (Kanji), card[1] = Back (Full Info)
    apkg.addCard(`<div class="kanji">${card[0]}</div>`, `<div class="back-container">${card[1]}</div>`)
  })

  const zip = await apkg.save()
  fs.writeFileSync('NotionToAnki.apkg', zip, 'binary')
  console.log('✨ SUCCESS: NotionToAnki.apkg created!')
}

async function crawlNotionToAnki() {
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
          const { exampleVal, kanji } = updateExampleToNotion({ row, kIdx, rIdx, mIdx, eIdx, forceUpdate: false })

          // CSV BACK SIDE FORMATTING
          const back = row.table_row.cells
            .map((cell, idx) => {
              let hName = originalHeaders[idx]
              if (hName.toLowerCase() === 'kanji') hName = 'Word/Phrase'
              const val = idx === eIdx ? exampleVal : cell.map((n) => n.plain_text).join('')
              return `<b>${hName}</b>: ${val}`
            })
            .join('<br>')

          allCards.push([kanji, back])
        }
      }
    }

    const csvWriter = createCsvWriter({ path: 'notion_to_anki.csv', header: ['Front', 'Back'] })
    await csvWriter.writeRecords(allCards)
    // await generateAnkiPkg(allCards)
    console.log(`\n✨ SUCCESS: ${allCards.length} cards exported.`)
  } catch (err) {
    console.error('Fatal Error:', err)
  }
}

crawlNotionToAnki()
