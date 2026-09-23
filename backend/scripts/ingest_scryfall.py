import requests
import gzip
import json
from app.database import SessionLocal, engine
from app.models import Base, CartaScryfall

# Aseguramos que la tabla exista en PostgreSQL antes de insertar datos
Base.metadata.create_all(bind=engine)

def fetch_scryfall_bulk_data():
    headers = {
        "User-Agent": "MTGCardMarketApp/1.0",
        "Accept": "application/json;q=0.9,*/*;q=0.8"
    }
    
    bulk_info_url = "https://api.scryfall.com/bulk-data"
    print("Consultando endpoint de Bulk Data...")
    response = requests.get(bulk_info_url, headers=headers)
    response.raise_for_status()
    
    items = response.json().get("data", [])
    
    # Localizar el objeto correspondiente a 'default_cards'
    target_item = None
    for item in items:
        if item.get("type") == "default_cards":
            target_item = item
            break
            
    if not target_item:
        raise ValueError("No se encontró el objeto 'default_cards' en la respuesta de Scryfall.")
    
    # Extraer la URI del volcado (.jsonl.gz)
    download_uri = target_item.get("jsonl_download_uri") or target_item.get("download_uri")
    if not download_uri:
        raise ValueError("No se encontró la URI de descarga en el objeto.")

    print(f"Descargando catálogo masivo desde: {download_uri}")
    bulk_response = requests.get(download_uri, headers=headers, stream=True)
    bulk_response.raise_for_status()

    cards = []
    print("Descomprimiendo y procesando JSONL en memoria...")
    with gzip.GzipFile(fileobj=bulk_response.raw) as gz:
        for line in gz:
            line_str = line.decode("utf-8").strip()
            if line_str:
                cards.append(json.loads(line_str))
                
    print(f"Total de cartas cargadas en memoria: {len(cards)}")
    return cards

def load_data_to_db(cards_data):
    db = SessionLocal()
    try:
        # Enfoque de carga destructiva: limpiamos la tabla para mantener la sincronización exacta con Scryfall
        print("Limpiando tabla actual...")
        db.query(CartaScryfall).delete()
        
        cartas_db = []
        print("Procesando objetos JSON...")
        for card in cards_data:
            # Manejamos cartas de doble cara u otros layouts complejos extrayendo la imagen principal si existe
            image_url = None
            if "image_uris" in card:
                image_url = card["image_uris"].get("normal")
            elif "card_faces" in card and "image_uris" in card["card_faces"][0]:
                image_url = card["card_faces"][0]["image_uris"].get("normal")

            nueva_carta = CartaScryfall(
                id=card.get("id"),
                name=card.get("name"),
                set=card.get("set"),
                type_line=card.get("type_line"),
                mana_cost=card.get("mana_cost"),
                image_url=image_url,
                scryfall_raw_data=card
            )
            cartas_db.append(nueva_carta)
            
        # Utilizamos bulk_save_objects para maximizar el rendimiento de inserción en SQL
        print("Insertando registros en la base de datos...")
        db.bulk_save_objects(cartas_db)
        db.commit()
        print(f"Éxito: Se sincronizaron {len(cartas_db)} cartas en el catálogo local.")
        
    except Exception as e:
        db.rollback()
        print(f"Error en la ingesta de datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    raw_data = fetch_scryfall_bulk_data()
    load_data_to_db(raw_data)