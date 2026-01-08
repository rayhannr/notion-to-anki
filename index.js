import 'dotenv/config'
import { Client } from '@notionhq/client'
import { createArrayCsvWriter as createCsvWriter } from 'csv-writer'
import { GoogleGenAI } from '@google/genai'
import { Mistral } from '@mistralai/mistralai'

const notion = new Client({ auth: process.env.NOTION_API_KEY })
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
const parentPageId = process.env.NOTION_PAGE_ID

async function getFullBlockChildren(blockId) {
  let allResults = []
  let hasMore = true
  let cursor = undefined
  while (hasMore) {
    const response = await notion.blocks.children.list({ block_id: blockId, start_cursor: cursor })
    allResults.push(...response.results)
    hasMore = response.has_more
    cursor = response.next_cursor
  }
  return allResults
}

async function generateJapaneseExample(word) {
  const prompt = `Generate a natural Japanese sentence using the word or phrase "${word}". 
    Criteria:
    - Difficulty: JLPT N4 advanced dokkai level.
    - Length: The Japanese text must be at least 20 Japanese characters long (excluding romaji).
    - Kanji: Use appropriate N4/N5 Kanji (don't write in pure Hiragana), a little kanji from higher level is fine.
    - Format: [Japanese sentence] [romaji] ([meaning in Indonesian or English, choose one]) 
    - Constraint: No bold, no extra text, no "Sure, here it is", no need to add dot at the very end of the sentence.
    Make it a bit long to look more complex. More than one sentence is okay, but please not too many.
    - Goal: Provide natural context for the usage of "${word}".`

  try {
    // const response = await genAI.models.generateContent({
    //   model: 'gemini-2.0-flash-lite',
    //   contents: [{ role: 'user', parts: [{ text: prompt }] }]
    // })
    // return response.text
    const response = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
      responseFormat: { type: 'text' }
    })
    return response.choices[0].message.content
  } catch (err) {
    console.error(err)
    return null
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function crawlNotionToAnki() {
  let allCards = []

  try {
    console.log('crawl start...')
    const subpages = await getFullBlockChildren(parentPageId)

    for (const page of subpages) {
      const pageTitle = page.child_page?.title
      if (page.type !== 'child_page' || pageTitle === 'notes') {
        if (pageTitle) console.log(`skipping page: ${pageTitle}`)
        continue
      }

      console.log(`processing page: ${pageTitle}`)
      const content = await getFullBlockChildren(page.id)
      const tables = content.filter((b) => b.type === 'table')

      for (const [tIdx, table] of tables.entries()) {
        const rows = await getFullBlockChildren(table.id)
        const tableRows = rows.filter((r) => r.type === 'table_row')
        if (tableRows.length < 2) continue

        const headers = tableRows[0].table_row.cells.map((c) => c.map((n) => n.plain_text).join(''))
        const exampleIdx = headers.findIndex((h) => h.toLowerCase() === 'example')
        const bodyRows = tableRows.slice(1)

        for (const row of bodyRows) {
          const cells = row.table_row.cells
          const front = cells[0].map((n) => n.plain_text).join('')
          let exampleVal = exampleIdx !== -1 ? cells[exampleIdx].map((n) => n.plain_text).join('') : ''

          if (exampleIdx !== -1 && !exampleVal) {
            console.log(`generating example for: ${front}`)
            const newExample = await generateJapaneseExample(front)

            if (newExample) {
              try {
                const updatedCells = [...cells]
                updatedCells[exampleIdx] = [{ type: 'text', text: { content: newExample } }]

                await notion.blocks.update({
                  block_id: row.id,
                  table_row: { cells: updatedCells }
                })
                exampleVal = newExample
                console.log(`updated notion: ${front}`)
                await sleep(1000)
              } catch (err) {
                console.error(`failed to update notion for ${front}, skipping update...`)
              }
            }
          }

          const back = cells
            .map((cell, idx) => {
              const val = idx === exampleIdx ? exampleVal : cell.map((n) => n.plain_text).join('')
              return `${headers[idx]}: ${val}`
            })
            .join('<br>')

          const tag = pageTitle.replace(/\s+/g, '_')
          allCards.push([front, back, tag])
        }
        console.log(`- finished processing ${tableRows.length} rows`)
      }
    }

    const csvWriter = createCsvWriter({
      path: 'notion_to_anki_v2.csv',
      header: ['Front', 'Back', 'Tags']
    })

    await csvWriter.writeRecords(allCards)
    console.log(`\nsuccess: ${allCards.length} cards generated.`)
  } catch (err) {
    console.error('error during execution:')
    console.error(err)
  }
}

crawlNotionToAnki()
