import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_API_KEY })
const pageId = process.env.NOTION_PAGE_ID

async function runMission() {
  try {
    const subpages = await notion.blocks.children.list({ block_id: pageId })

    for (const block of subpages.results) {
      if (block.type !== 'child_page') continue

      const pageTitle = block.child_page.title
      if (pageTitle.toLowerCase() === 'notes') continue

      console.log(`\n--- Processing: ${pageTitle} ---`)

      const blocksInPage = await notion.blocks.children.list({ block_id: block.id })
      const tableBlocks = blocksInPage.results.filter((b) => b.type === 'table')

      if (tableBlocks.length === 0) {
        console.log(`- No tables found.`)
        continue
      }

      for (const tableBlock of tableBlocks) {
        let allRows = []
        let cursor = undefined

        while (true) {
          const response = await notion.blocks.children.list({
            block_id: tableBlock.id,
            start_cursor: cursor
          })
          allRows.push(...response.results)
          if (!response.has_more) break
          cursor = response.next_cursor
        }

        const dataRows = allRows.slice(1)
        const totalRowsOriginal = allRows.length
        let togglesToCreate = []

        for (const row of dataRows) {
          const cells = row.table_row.cells
          const headText = cells[0]?.map((t) => t.plain_text).join('') || ''
          const contentText = cells.map((cell) => cell.map((t) => t.plain_text).join('')).join('\n')

          togglesToCreate.push({
            object: 'block',
            type: 'toggle',
            toggle: {
              rich_text: [{ type: 'text', text: { content: headText } }],
              children: [
                {
                  object: 'block',
                  type: 'paragraph',
                  paragraph: { rich_text: [{ type: 'text', text: { content: contentText } }] }
                }
              ]
            }
          })
        }

        for (let i = 0; i < togglesToCreate.length; i += 100) {
          const chunk = togglesToCreate.slice(i, i + 100)
          await notion.blocks.children.append({
            block_id: block.id,
            children: chunk
          })
        }

        if (totalRowsOriginal === togglesToCreate.length + 1) {
          console.log(`✅ Table converted (${togglesToCreate.length} rows). Deleting...`)
          await notion.blocks.delete({ block_id: tableBlock.id })
        } else {
          console.error(`❌ Mismatch! Table kept.`)
        }
      }
    }
    console.log('\nMission Accomplished, Boy!')
  } catch (error) {
    console.error('Error Detail:', error.body || error)
  }
}

runMission()
