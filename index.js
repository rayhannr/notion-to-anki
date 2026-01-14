import 'dotenv/config'
import { createArrayCsvWriter as createCsvWriter } from 'csv-writer'
import pkg from 'anki-apkg-export'
const AnkiExport = pkg.default || pkg
import fs from 'fs'
import { getDatabaseRows, getFullBlockChildren, updateExampleToNotion } from './shared.js'

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

      const content = await getFullBlockChildren(page.id)
      const databases = content.filter((b) => b.type === 'child_database')

      for (const db of databases) {
        const pages = await getDatabaseRows(db.id)
        const pageTitle = page.child_page.title
        console.log(`\n📄 Processing Page: ${pageTitle} with ${pages.length} rows`)
        if (pages.length === 0) continue

        for (const row of pages) {
          const { exampleVal, kanji } = await updateExampleToNotion({ row, forceUpdate: false })

          if (!kanji) continue

          const back = Object.keys(row)
            .filter((k) => k !== 'id')
            .map((pName) => {
              let hName = pName === 'Kanji' ? 'Word/Phrase' : pName
              const val = pName === 'Example' ? exampleVal : row[pName] || ''
              return `${hName}: ${val}`
            })
            .join('<br>')

          allCards.push([kanji, back])
        }
      }
    }

    const csvWriter = createCsvWriter({ path: 'notion_to_anki2.csv', header: ['Front', 'Back'] })
    await csvWriter.writeRecords(allCards)
    // await generateAnkiPkg(allCards)
    console.log(`\n✨ SUCCESS: ${allCards.length} cards collected.`)
  } catch (err) {
    console.error('Fatal Error:', err)
  }
}

crawlNotionToAnki()
