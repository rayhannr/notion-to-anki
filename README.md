# Notion to Anki

This tool automates the creation of Japanese study materials by transforming **Notion Databases** into **Anki** cards using **Mistral AI**.

It crawls your Notion workspace, pulls vocabulary from your databases, and generates natural Japanese sentences for every entry. These examples include the Japanese sentence, romaji reading, and English meaning, optimized for N4/N3 reading practice.

## How it Works

1. **Add Vocabulary**: Add new words to your Notion Databases.
2. **Process**: Run the script to iterate through your databases. It identifies entries missing examples and uses Mistral AI to generate contextually relevant sentences based on your desired level and tone.
3. **Export**: The tool generates a packaged **Anki deck (.apkg)** and a **CSV** file, styled and ready for immediate import.

## Setup and Requirements

### 1. Notion Database Structure

Your databases must use these exact property names:

- **Kanji** (Title property)
- **Romaji** (Text)
- **Meaning** (Text)
- **Example** (Text)

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
NOTION_API_KEY=your_notion_integration_token
NOTION_PAGE_ID=your_parent_page_id
MISTRAL_API_KEY=your_mistral_api_key
```

### 3. Installation

```bash
npm install
```

## Usage

To generate your cards, run:

```bash
node index.js
```

This will produce `notion_to_anki2.csv` and `NotionToAnki.apkg`.

## Maintenance Tools

- `generate-example.js`: Bulk generate or override examples for an entire database.
- `fix-romaji-typo.js`: AI proofreader to synchronize romaji and clean up sentence context.
- `clean-examples.js`: Deduplicates entries and keeps only the most detailed sentences.
- `convert-tables-to-databases.js`: Legacy utility to migrate old Notion "Simple Tables" into Databases.

---

_Note: Examples range from 24-50 characters (N4/N3 level)._
