# Notion to Anki AI Bridge

This project started with a simple problem: `Notion` tables are great for dumping new Japanese vocabulary, but they are not very effective for active recall. I found myself with hundreds of rows of words that were sitting unused because they were trapped in a table format. To solve this, I built a bridge that uses `Mistral AI` to transform those static tables into high quality study materials for `Anki`.

The core of the system is a script that crawls a `Notion` workspace and finds all your vocabulary tables. Instead of just exporting the raw words, it uses an AI to generate natural Japanese sentences for every entry. These examples are formatted into three line snippets containing the Japanese sentence, its `romaji` reading, and the English meaning.

Please note that this tool is designed for advanced learners. The generated example sentences range from 24 to 50 Japanese characters in length, which typically aligns with `N4` or `N3` level reading materials. Because of this high information density, the output might be challenging for complete beginners.

## The Journey of a Word

The workflow is designed to be as simple as possible for a student. First, you add new words to your `Notion` tables as you encounter them. When you are ready to study, you run the main script.

The main script iterates through your tables and checks for any entries without examples. When it finds one, it asks the AI to create a contextually relevant example sentence that matches your desired `JLPT` level and tone. Whether you want a formal news style report or a casual conversational dialogue, the system adjusts its output accordingly.

Once the AI has finished enhancing your list, the project generates a `CSV` file and a packaged `Anki` deck. This deck is styled for readability and is ready to be imported directly into `Anki` for your daily review sessions.

## Setup and Requirements

To get started, you will need to provide your API keys and the ID of your parent `Notion` page. Create a file named `.env` in the root directory with the following variables:

`NOTION_API_KEY`: Your integration token from the `Notion` developer portal.

`NOTION_PAGE_ID`: The ID of the page containing your vocabulary tables.

`MISTRAL_API_KEY`: Your API key from `Mistral AI`.

After setting up your credentials, install the necessary dependencies by running:

`npm install`

## Running the Bridge

When you are ready to transform your `Notion` tables into an `Anki` deck, simply execute:

`node index.js`

This will crawl your pages, generate any missing examples, and produce both `notion_to_anki.csv` and `NotionToAnki.apkg` in your project folder.

## Maintenance and Reference

I have also included specialized scripts that I use for my own personal maintenance. While they are not part of the standard workflow, they are available in the repository as a reference for advanced users:

`generate-example.js`: A utility script to bulk generate examples for an entire database.

`fix-romaji-typo.js`: A smart proofreader that synchronizes `romaji` with Japanese text and cleans up low quality examples.

`clean-examples.js`: A script designed to deduplicate entries and keep only the most detailed sentences.
