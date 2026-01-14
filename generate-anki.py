import genanki
import sys
import json

def sanitize_string(s):
    """Remove lone surrogate characters that can't be encoded to UTF-8."""
    if not isinstance(s, str):
        return s
    return s.encode('utf-8', 'ignore').decode('utf-8')

def create_apkg(cards):
    model_id = 1607392319
    deck_id = 2059400110

    style = """
    .card { font-family: "Helvetica", "Arial", sans-serif; font-size: 20px; text-align: center; }
    .front { font-size: 45px; margin-bottom: 20px; }
    .back-container { text-align: left; display: inline-block; width: 90%; margin-top: 10px; border-top: 1px solid #ccc; padding-top: 10px; }
    """

    my_model = genanki.Model(
        model_id,
        'Notion Advanced Model',
        fields=[{'name': 'Front'}, {'name': 'Back'}],
        templates=[{
            'name': 'Card 1',
            'qfmt': '<div class="front">{{Front}}</div>',
            'afmt': '{{FrontSide}}<hr id="answer"><div class="back-container">{{Back}}</div>',
        }],
        css=style
    )

    my_deck = genanki.Deck(deck_id, 'Notion to Anki • Japanese N4+')

    for card in cards:
        note = genanki.Note(model=my_model, fields=[sanitize_string(card[0]), sanitize_string(card[1])])
        my_deck.add_note(note)

    genanki.Package(my_deck).write_to_file('NotionToAnki.apkg')

if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    create_apkg(data)