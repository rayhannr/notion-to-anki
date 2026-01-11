import { Mistral } from '@mistralai/mistralai'
import { Client } from '@notionhq/client'

/**
 * Helper to fetch all children blocks from a Notion block/page
 */
export async function getFullBlockChildren(blockId) {
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

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
export const notion = new Client({ auth: process.env.NOTION_API_KEY })
export const MIN_LENGTH = 24
export const MAX_LENGTH = 50

export async function generateExample(kanji, romaji, meaning, currentExample, mode, style) {
  // Enhanced instructions to force complex clause structures
  let levelInstruction = ''
  let toneInstruction = ''

  if (mode === 'hard') {
    levelInstruction = 'STYLE: Advanced N4/N3 Dokkai. Use sophisticated structures and High information density.'
  } else if (mode === 'easy') {
    levelInstruction =
      'STYLE: Easy/Natural N4. Use common everyday structures and keep it simple (but not so easy) and clear, but still natural Japanese.'
  } else {
    levelInstruction = 'STYLE: Standard N4 Dokkai. Use clear conjunctions and sounds like a textbook reading passage.'
  }

  if (style === 'conversational') {
    toneInstruction =
      'TONE: Conversational. Use natural spoken Japanese (e.g., short forms like ~てる, ~なきゃ if applicable). It should feel like an actual dialogue.'
  } else {
    toneInstruction =
      'TONE: Descriptive/Formal. Use academic or news-style structures (e.g., ~と言われている). It should feel like written text.'
  }

  try {
    const response = await mistral.chat.complete({
      model: 'mistral-medium-latest', // Upgraded to medium for better linguistic nuance
      messages: [
        {
          role: 'system',
          content: `You are a Japanese linguistic expert for JLPT study materials.
          
          REFERENCE: Word: "${kanji}" (${romaji}), Meaning: "${meaning}".

          TASK:
          1. TRANSFORM: Convert simple sentences into high-density Dokkai (reading) snippets.
          2. ${levelInstruction}
          3. ${toneInstruction}
          4. ANTI-SIMPLICITY: Avoid "A is B" or simple "I do X" sentences. Use relative clauses and conjunctions.
          5. LENGTH: Strictly ${MIN_LENGTH} to ${MAX_LENGTH} Japanese characters.
          6. ANTI-LAZY: No rain/ame (雨) context unless the target word is actually rain.
          7. CURATE: Keep exactly 2 unique, high-quality examples if possible.
          
          FORMAT:
          - Exactly 3 lines per example:
            [Japanese]
            [romaji]
            ([meaning])
          - Separate multiple examples with a blank line.
          - There should be no new lines between Japanese-Japanese, romaji-romaji, and meaning-meaning
          - There should be only 1 new line between Japanese to romaji to meaning (no spaces between them)
          - Empty line should be applied between examples only
          - NO newline within the sentence
          - NO bold, NO markdown, NO notes, NO chatter.`
        },
        {
          role: 'user',
          content: `Input to transform: "${currentExample || 'EMPTY'}"`
        }
      ],
      temperature: 0.4 // Slightly higher for more varied vocabulary
    })

    let result = response.choices[0].message.content.trim()
    result = result
      .replace(/\*/g, '')
      .replace(/^(Note|Level|Japanese:|Romaji:|Meaning:)/gim, '')
      .trim()
    result = result.replace(/^"|"$/g, '')
    return result
  } catch (err) {
    console.error('❌ Mistral Error:', err.message)
    return null
  }
}

export async function updateExampleToNotion({ row, kIdx, rIdx, mIdx, eIdx, forceUpdate }) {
  const cells = row.table_row.cells
  const kanji = cells[kIdx]?.map((n) => n.plain_text).join('') || ''
  const romaji = cells[rIdx]?.map((n) => n.plain_text).join('') || ''
  const meaning = cells[mIdx]?.map((n) => n.plain_text).join('') || ''
  let exampleVal = cells[eIdx]?.map((n) => n.plain_text).join('') || ''

  if (!!exampleVal && !forceUpdate) {
    console.log(`📝 Example for ${kanji} already exists: ${exampleVal}, skipping...`)
    return { exampleVal, kanji }
  }

  const randMode = Math.random()
  const randStyle = Math.random()
  let mode = 'standard'
  if (randMode < 0.08) mode = 'hard'
  else if (randMode < 0.18) mode = 'easy'
  let style = 'conversational'
  if (randStyle < 0.5) style = 'formal'
  console.log(`🛠️ Processing [${kanji}]: ${mode} ${style}`)

  const fixedText = await generateExample(kanji, romaji, meaning, exampleVal, mode, style)

  if (fixedText && fixedText !== exampleVal) {
    try {
      const updatedCells = [...cells]
      updatedCells[eIdx] = [{ type: 'text', text: { content: fixedText } }]
      await notion.blocks.update({ block_id: row.id, table_row: { cells: updatedCells } })
      exampleVal = fixedText
      console.log(`   ✅ Notion Updated.`)
      await sleep(1000)
    } catch (err) {
      console.log(`   ❌ Notion Update Error.`)
    }
  }

  return { exampleVal, kanji }
}
