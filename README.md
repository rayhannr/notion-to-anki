# Notion Table to Toggle Converter for Anki

## Why I made this

I am currently learning Japanese and my habit was to dump every new word I found into Notion tables. The problem is that these lists just ended up sitting there unused because tables aren't great for active recall.

I wanted to move everything to Anki using the Notion Toggles to Anki addon. The issue is that the addon only recognizes toggle lists, not tables. Converting hundreds of rows across several pages manually was out of the question, so I wrote this script to automate the process.

## Features

- Scans a parent page and processes all subpages.
- Ignores pages named "notes." because it's just notes I took during the class I attended.
- Handles multiple tables per page.
- Converts the first column into the toggle header.
- Put all other columns inside the toggle body, separated by new lines.
- Includes pagination and chunking to handle Notion API limits (more than 100 rows).
- Auto-deletes the original table only if the conversion count matches the row count.
