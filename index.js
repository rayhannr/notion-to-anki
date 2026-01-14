import 'dotenv/config'
import { createArrayCsvWriter as createCsvWriter } from 'csv-writer'
import fs from 'fs'
import { getDatabaseRows, getFullBlockChildren, updateExampleToNotion } from './shared.js'

const parentPageId = process.env.NOTION_PAGE_ID

import { spawn } from 'child_process'

async function generateAnkiPkg(cards) {
  return new Promise((resolve, reject) => {
    console.log('\n📦 Packaging into .apkg via Python Genanki...')

    const python = spawn('python', ['generate-anki.py'])
    python.stdin.write(JSON.stringify(cards))
    python.stdin.end()

    python.stdout.on('data', (data) => console.log(`Python: ${data}`))

    python.stderr.on('data', (data) => {
      console.error(`Python Error: ${data}`)
    })

    python.on('close', (code) => {
      if (code === 0) {
        console.log('✨ SUCCESS: NotionToAnki.apkg created via Genanki!')
        resolve()
      } else {
        reject(new Error(`Python process exited with code ${code}`))
      }
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

          const back = Object.keys(row)
            .filter((k) => k !== 'id')
            .map((pName) => {
              let hName = pName === 'Kanji' ? '' : `${pName}:`
              const val = pName === 'Example' ? exampleVal : row[pName] || ''
              return `${hName} ${val}`
            })
            .join('<br>')

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
