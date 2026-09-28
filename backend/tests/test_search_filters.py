from app.crud.crud_cards import extract_oracle_text, get_mechanic_ids


def test_extract_oracle_text_single_face():
    raw_data = {"oracle_text": "Counter target spell."}
    assert extract_oracle_text(raw_data) == "Counter target spell."


def test_extract_oracle_text_double_faced():
    raw_data = {
        "card_faces": [
            {"oracle_text": "Whenever you cast a spell, draw a card."},
            {"oracle_text": "Destroy all creatures."}
        ]
    }
    extracted = extract_oracle_text(raw_data)
    assert "draw a card" in extracted
    assert "Destroy all creatures" in extracted


def test_mechanic_detection():
    counter_text = "Counter target noncreature spell."
    wipe_text = "Destroy all creatures. They can't be regenerated."
    
    assert "counterspell" in get_mechanic_ids(counter_text)
    assert "board_wipe" in get_mechanic_ids(wipe_text)