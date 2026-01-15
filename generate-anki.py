import genanki
import csv
import os
import sys
import html

# Fix Windows encoding for emoji output
sys.stdout.reconfigure(encoding='utf-8')

def create_anki_from_csv(csv_path):
    # Fixed IDs to prevent duplicate decks in Anki
    MODEL_ID = 1607392319
    DECK_ID = 2059400110

    # Styling for the cards
    style = """
    .card { 
        font-family: "Helvetica", "Arial", sans-serif; 
        font-size: 20px; 
        text-align: center; 
        color: #2c3e50;
    }
    .front { font-size: 45px; margin-bottom: 20px; font-weight: bold; }
    .back-container { 
        text-align: left; 
        display: inline-block; 
        width: 90%; 
        margin-top: 10px;
        white-space: pre-line;
        line-height: 1.6;
    }
    """

    # Define the Card Model
    my_model = genanki.Model(
        MODEL_ID,
        'Notion CSV Model',
        fields=[{'name': 'Front'}, {'name': 'Back'}],
        templates=[{
            'name': 'Card 1',
            'qfmt': '<div class="front">{{Front}}</div>',
            'afmt': '{{FrontSide}}<hr id="answer"><div class="back-container">{{Back}}</div>',
        }],
        css=style
    )

    my_deck = genanki.Deck(DECK_ID, 'Notion to Anki • Japanese N4+')

    if not os.path.exists(csv_path):
        print(f"Error: File '{csv_path}' not found!")
        return

    print(f"Reading data from {csv_path}...")
    
    # 'errors=ignore' handles the \udc81 ghost characters by stripping them out
    try:
        with open(csv_path, mode='r', encoding='utf-8', errors='ignore') as f:
            reader = csv.reader(f)
            # Skip CSV header
            header = next(reader, None) 
            
            card_count = 0
            for row in reader:
                if len(row) < 2:
                    continue
                
                front = row[0]
                back = row[1]
                
                # Fix HTML: unescape any escaped HTML entities (&lt;br&gt; -> <br>)
                # and convert actual newlines to <br> tags
                back = html.unescape(back)
                back = back.replace('\n', '<br>')
                
                note = genanki.Note(model=my_model, fields=[front, back])
                my_deck.add_note(note)
                card_count += 1

        # Generate the .apkg file
        output_file = 'NotionToAnki.apkg'
        genanki.Package(my_deck).write_to_file(output_file)
        print(f"✨ SUCCESS: {card_count} notes packaged into {output_file}")

    except Exception as e:
        print(f"Fatal Error during packaging: {e}")

if __name__ == "__main__":
    create_anki_from_csv('notion_to_anki.csv')