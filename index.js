import 'dotenv/config'
import { createArrayCsvWriter as createCsvWriter } from 'csv-writer'
import { exec } from 'child_process'
import { getDatabaseRows, getFullBlockChildren, updateExampleToNotion } from './shared.js'

const parentPageId = process.env.NOTION_PAGE_ID

async function generateAnkiPkg() {
  return new Promise((resolve, reject) => {
    console.log('📦 Starting Python Anki generator...')

    // Run the python script
    exec('python generate-anki.py', (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Python Exec Error: ${error.message}`)
        return reject(error)
      }
      if (stderr) {
        console.error(`⚠️ Python Stderr: ${stderr}`)
      }

      console.log(`🐍 Python Output: ${stdout.trim()}`)
      resolve()
    })
  })
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

          const backParts = []

          if (row['Kanji']) {
            backParts.push(row['Kanji'])
          }

          Object.keys(row)
            .filter((k) => k !== 'id' && k !== 'Example' && k !== 'Kanji')
            .forEach((columnName) => {
              const val = row[columnName] || ''
              backParts.push(`${columnName}: ${val}`)
            })

          if (exampleVal) {
            backParts.push(exampleVal)
          }

          const back = backParts.join('<br>')

          allCards.push([kanji, back])
        }
      }
    }

    const csvWriter = createCsvWriter({ path: 'notion_to_anki.csv', header: ['Front', 'Back'] })
    await csvWriter.writeRecords(allCards)
    await generateAnkiPkg(allCards)
    console.log(`\n✨ SUCCESS: ${allCards.length} cards collected.`)
  } catch (err) {
    console.error('Fatal Error:', err)
  }
}

crawlNotionToAnki()
