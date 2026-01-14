# Notion to Anki

This tool automates the creation of Japanese study materials by transforming **Notion Databases** into **Anki** cards using **Mistral AI** and **genanki**.

It crawls your Notion workspace, pulls vocabulary from your databases, and generates natural Japanese sentences for every entry. These examples include the Japanese sentence, romaji reading, and English/Indonesian meaning, optimized for N4/N3 reading practice. The tool uses a Python script with genanki to package the cards into a ready-to-import `.apkg` file.

## How it Works

1. **Add Vocabulary**: Add new words to your Notion Databases.
2. **Process**: Run the script to iterate through your databases. It identifies entries missing examples and uses Mistral AI to generate contextually relevant sentences based on your desired level and tone.
3. **Export**: The tool generates a **CSV** file and uses Python's genanki library to package it into an **Anki deck (.apkg)**, styled and ready for immediate import.

### Card Format

Each Anki card is structured as follows:

- **Front**: The word/phrase
- **Back**: Properties in order:
  1. Word (no label)
  2. Other properties like Meaning (with labels)
  3. AI-generated Example sentence (no label)

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

Install Node.js dependencies:

```bash
npm install
```

Install Python dependencies:

```bash
pip install genanki
```

## Usage

To generate your cards, run:

```bash
node index.js
```

This will:

1. Crawl your Notion databases and generate examples using Mistral AI
2. Create `notion_to_anki.csv` with all card data
3. Run `generate-anki.py` to package the CSV into `NotionToAnki.apkg`

## Maintenance Tools

- `generate-example.js`: Bulk generate or override examples for an entire database.
- `fix-romaji-typo.js`: AI proofreader to synchronize romaji and clean up sentence context.
- `clean-examples.js`: Deduplicates entries and keeps only the most detailed sentences.
- `convert-tables-to-databases.js`: Legacy utility to migrate old Notion "Simple Tables" into Databases.

---

_Note: Examples range from 24-50 characters (N4/N3 level)._
