# seed_test_cards.py
# ---------------------------------------------------------
# SCRIPT DE POBLADO DE CARTAS PARA TESTING DE COMMANDER
# ---------------------------------------------------------
"""
Puebla cartas de prueba de Magic: The Gathering desde Scryfall
para validar color_identity e invariantes de Commander.
"""
from app.database import SessionLocal
from app.services.scryfall_service import ScryfallService

SAMPLE_CARDS = [
    # Comandantes
    "Atraxa, Praetors' Voice",  # W, U, B, G
    "Kozilek, the Great Distortion",  # Incoloro
    "Urza, Lord High Artificer",  # U
    # Criaturas / Spells
    "Sol Ring",  # Incoloro
    "Counterspell",  # U
    "Lightning Bolt",  # R
    "Cultivate",  # G
    "Swords to Plowshares",  # W
    "Dark Ritual",  # B
]


def seed_cards():
    db = SessionLocal()
    try:
        print("\n" + "=" * 60)
        print("INICIANDO INGESTA DE CARTAS MTG DESDE SCRYFALL...")
        print("=" * 60)

        for card_name in SAMPLE_CARDS:
            card = ScryfallService.fetch_and_store_by_name(db, card_name)
            if card:
                print(f"✔ [INGESTA EXITOSA] {card.name.ljust(32)} | Identidad: [{card.color_identity}] | CMC: {card.cmc}")
            else:
                print(f"✖ [ERROR/NO ENCONTRADA] {card_name}")

        print("\nIngesta finalizada correctamente.\n")
    finally:
        db.close()


if __name__ == "__main__":
    seed_cards()