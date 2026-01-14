import 'dotenv/config'
import { Client } from '@notionhq/client'
import { Mistral } from '@mistralai/mistralai'
import { getFullBlockChildren, sleep, getDatabaseRows } from './shared.js'

const notion = new Client({ auth: process.env.NOTION_API_KEY })
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
const parentPageId = process.env.NOTION_PAGE_ID

/**
 * Curator: Only removes duplicates and keeps the 2 longest examples.
 */
async function curateExamplesMistral(exampleText) {
  try {
    const response = await mistral.chat.complete({
      model: 'mistral-medium-latest',
      messages: [
        {
          role: 'system',
          content: `You are a data editor. 
          
          TASK:
          1. DEDUPLICATE: If there are multiple examples with the same Japanese sentence but different translations, KEEP ONLY ONE.
          2. LIMIT: If more than 2 unique examples exist, remove the one whose context is about rain. If there are still more than 2 examples, KEEP ONLY the 2 longest ones.
          3. FORMAT: Keep the 3-line format for each:
             [Japanese]
             [romaji]
             ([meaning])
          
          STRICT RULES:
          - DO NOT fix typos. DO NOT change any text.
          - NO bold, NO notes, NO chatter.
          - If no changes are needed, return the original text exactly.`
        },
        {
          role: 'user',
          content: `Clean this text: "${exampleText}"`
        }
      ],
      temperature: 0
    })

    let result = response.choices[0].message.content.trim()

    // Cleanup AI artifacts
    result = result.replace(/\*/g, '')
    result = result.replace(/^(Note|Level|Character|Commentary|Explanation|Line \d:|Japanese:|Romaji:|Meaning:)/gim, '').trim()
    result = result.replace(/^"|"$/g, '')

    return result
  } catch (err) {
    console.error('❌ Mistral Error:', err.message)
    return null
  }
}

async function startCurating() {
  try {
    console.log('--- 🚀 STARTING CURATION ---')
    const subpages = await getFullBlockChildren(parentPageId)

    for (const page of subpages) {
      if (page.type !== 'child_page' || page.child_page?.title === 'notes') continue

      console.log(`\n📄 Page: ${page.child_page.title}`)
      const content = await getFullBlockChildren(page.id)
      const databases = content.filter((b) => b.type === 'child_database')

      for (const db of databases) {
        const pages = await getDatabaseRows(db.id)
        if (pages.length === 0) continue

        for (const row of pages) {
          const word = row.Kanji || ''
          const currentExample = row.Example || ''

          if (currentExample.length > 5) {
            console.log(`🔍 Curating row... ${word}`)
            const curatedText = await curateExamplesMistral(currentExample)

            if (curatedText && curatedText !== currentExample) {
              try {
                await notion.pages.update({
                  page_id: row.id,
                  properties: {
                    Example: {
                      rich_text: [{ type: 'text', text: { content: curatedText } }]
                    }
                  }
                })
                console.log(`   ✅ Duplicates removed / Kept 2 longest.`)
                await sleep(500)
              } catch (err) {
                console.log(`   ❌ Notion Error.`)
              }
            } else {
              console.log(`   ⏭️ Skip (Already optimal).`)
            }
          }
        }
      }
    }
    console.log('\n--- ✨ CURATION COMPLETE ---')
  } catch (err) {
    console.error('Fatal Error:', err)
  }
}

startCurating()
