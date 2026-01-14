import 'dotenv/config'
import { Client } from '@notionhq/client'
import { Mistral } from '@mistralai/mistralai'
import { getFullBlockChildren, sleep, getDatabaseRows } from './shared.js'

const notion = new Client({ auth: process.env.NOTION_API_KEY })
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
const parentPageId = process.env.NOTION_PAGE_ID

/**
 * Smart Proofreader: Typos, Context Sync, Deduplication, and Length Filtering
 */
async function smartFixMistral(kanji, romaji, meaning, exampleText) {
  try {
    const response = await mistral.chat.complete({
      model: 'mistral-medium-latest',
      messages: [
        {
          role: 'system',
          content: `You are a strict Japanese proofreader and editor. 
          
          REFERENCE: Word: "${kanji}" (${romaji}), Meaning: "${meaning}".

          RULES:
          1. FIX: Fix romaji typos to match the Japanese text exactly.
          2. CONTEXT: Example must match the specific reading "${romaji}".
          3. ANTI-LAZY: If word is NOT "rain/ame", replace rain-based examples with variety.
          4. DEDUPLICATE: If examples have the same Japanese text but different translation languages, KEEP ONLY ONE.
          5. LENGTH FILTER: If there are more than 2 unique examples, KEEP ONLY THE 2 LONGEST ones and make sure it is not about rain as explained in rule number 2 (most detailed).
          6. EMPTY: If the example is empty, please add some using the above rules
          7. LENGTH: If the example is too short (less than 8 words), please make it longer
          
          FORMAT:
          - Exactly 3 lines per example:
            [Japanese]
            [romaji]
            ([meaning])
          - Separate multiple examples with a blank line.
          - NO bold (**), NO markdown, NO notes, NO chatter.
          - If already correct and follows all rules, return original exactly.`
        },
        {
          role: 'user',
          content: `Process these examples: "${exampleText}"`
        }
      ],
      temperature: 0.2
    })

    let result = response.choices[0].message.content.trim()

    // Nuclear Cleanup
    result = result.replace(/\*/g, '')
    result = result
      .replace(/^(Note|Level|Character|Commentary|Explanation|Fixed|Corrected|Line \d:|Japanese:|Romaji:|Meaning:)/gim, '')
      .trim()
    result = result.replace(/^"|"$/g, '')

    return result
  } catch (err) {
    console.error('❌ Mistral Error:', err.message)
    return null
  }
}

async function startSmartCleanup() {
  try {
    console.log('--- 🚀 STARTING CLEANUP FROM (KEEP 2 LONGEST) ---')
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
          const kanji = row.Kanji || ''
          const romaji = row.Romaji || ''
          const meaning = row.Meaning || ''
          const currentExample = row.Example || ''

          if (currentExample.length > 5) {
            console.log(`🔍 Checking: [${kanji}]`)
            const fixedText = await smartFixMistral(kanji, romaji, meaning, currentExample)

            if (fixedText && fixedText !== currentExample) {
              try {
                await notion.pages.update({
                  page_id: row.id,
                  properties: {
                    Example: {
                      rich_text: [{ type: 'text', text: { content: fixedText } }]
                    }
                  }
                })
                console.log(`   ✅ Optimized (Kept 2 longest, if any).`)
                await sleep(500)
              } catch (err) {
                console.log(`   ❌ Notion Error.`)
              }
            } else {
              console.log(`   ⏭️ Skip.`)
            }
          }
        }
      }
    }
    console.log('\n--- ✨ DONE! ---')
  } catch (err) {
    console.error('Fatal Error:', err)
  }
}

startSmartCleanup()
