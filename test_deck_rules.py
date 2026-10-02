from app.database import SessionLocal
from app.models.card import CartaScryfall
from app.models.deck import Deck
from app.models.user import User


def run_commander_validation_checks():
    db = SessionLocal()
    try:
        print("\n" + "=" * 65)
        print("VALIDACIÓN DE LEGALIDAD DE COMMANDER CON DATOS REALES")
        print("=" * 65)

        user = db.query(User).filter(User.username == "admin_tester").first()
        if not user:
            print("? Usuario admin_tester no encontrado. Corre seed_test_user.py primero.")
            return

        atraxa = db.query(CartaScryfall).filter(CartaScryfall.name == "Atraxa, Praetors' Voice").first()
        kozilek = db.query(CartaScryfall).filter(CartaScryfall.name == "Kozilek, the Great Distortion").first()
        sol_ring = db.query(CartaScryfall).filter(CartaScryfall.name == "Sol Ring").first()
        counterspell = db.query(CartaScryfall).filter(CartaScryfall.name == "Counterspell").first()
        bolt = db.query(CartaScryfall).filter(CartaScryfall.name == "Lightning Bolt").first()

        assert atraxa and kozilek and sol_ring and counterspell and bolt, "Faltan cartas en el catálogo local."

        # CASO 1: Atraxa (W, U, B, G) con Lightning Bolt (R) -> ILEGAL
        deck_atraxa = Deck(
            user_id=str(user.id),
            name="Mazo Atraxa Test",
            format="Commander"
        )
        deck_atraxa.add_card(scryfall_card_id=atraxa.id, quantity=1, category="commander")
        deck_atraxa.add_card(scryfall_card_id=counterspell.id, quantity=1, category="mainboard")
        deck_atraxa.add_card(scryfall_card_id=sol_ring.id, quantity=1, category="mainboard")
        deck_atraxa.add_card(scryfall_card_id=bolt.id, quantity=1, category="mainboard")

        res_atraxa = deck_atraxa.validate_legality()
        print("\nCaso 1: Atraxa (W,U,B,G) con Lightning Bolt (R)")
        print(f"Identidad calculada del comandante: {deck_atraxa.get_commander_color_identity()}")
        print(f"¿Es legal?: {res_atraxa['is_legal']}")
        print("Infracciones detectadas:")
        for issue in res_atraxa["issues"]:
            print(f"  - {issue}")

        # CASO 2: Kozilek (Incoloro) con Counterspell (U) -> ILEGAL
        deck_kozilek = Deck(
            user_id=str(user.id),
            name="Mazo Kozilek Test",
            format="Commander"
        )
        deck_kozilek.add_card(scryfall_card_id=kozilek.id, quantity=1, category="commander")
        deck_kozilek.add_card(scryfall_card_id=sol_ring.id, quantity=1, category="mainboard")
        deck_kozilek.add_card(scryfall_card_id=counterspell.id, quantity=1, category="mainboard")

        res_kozilek = deck_kozilek.validate_legality()
        print("\nCaso 2: Kozilek (Incoloro) con Counterspell (U)")
        print(f"Identidad calculada del comandante: {deck_kozilek.get_commander_color_identity()}")
        print(f"¿Es legal?: {res_kozilek['is_legal']}")
        print("Infracciones detectadas:")
        for issue in res_kozilek["issues"]:
            print(f"  - {issue}")

        print("\n" + "=" * 65 + "\n")

    finally:
        db.close()


if __name__ == "__main__":
    run_commander_validation_checks()
