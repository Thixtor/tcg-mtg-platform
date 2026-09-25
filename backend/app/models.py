import uuid
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


# ---------------------------------------------------------
# 1. CATÁLOGO OFICIAL DE SCRYFALL
# ---------------------------------------------------------
class CartaScryfall(Base):
    __tablename__ = 'cartas'

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    set = Column(String, index=True)
    type_line = Column(String)
    mana_cost = Column(String)
    image_url = Column(String)
    scryfall_raw_data = Column(JSON, nullable=False)

    instances_in_collections = relationship("UserCard", back_populates="card_catalog")


# ---------------------------------------------------------
# 2. USUARIOS CON VERIFICACIÓN POR CELULAR
# ---------------------------------------------------------
class User(Base):
    __tablename__ = 'users'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    
    # Verificación de identidad para trades seguros
    phone_number = Column(String, unique=True, index=True, nullable=False)
    is_phone_verified = Column(Boolean, default=False, nullable=False)
    verification_code = Column(String, nullable=True)  # Código OTP temporal
    reputation_score = Column(Integer, default=100)

    # Relaciones
    collections = relationship("Collection", back_populates="owner", cascade="all, delete-orphan")


# ---------------------------------------------------------
# 3. COLECCIONES / BINDERS
# ---------------------------------------------------------
class Collection(Base):
    __tablename__ = 'collections'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    owner = relationship("User", back_populates="collections")
    cards = relationship("UserCard", back_populates="collection", cascade="all, delete-orphan")


# ---------------------------------------------------------
# 4. CARTAS EN LA COLECCIÓN (Trade / Inventario)
# ---------------------------------------------------------
class UserCard(Base):
    __tablename__ = 'user_cards'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    collection_id = Column(String, ForeignKey('collections.id'), nullable=False, index=True)
    scryfall_card_id = Column(String, ForeignKey('cartas.id'), nullable=False, index=True)

    quantity = Column(Integer, default=1, nullable=False)
    condition = Column(String, default="NM")
    language = Column(String, default="en")
    is_foil = Column(Boolean, default=False)

    is_for_trade = Column(Boolean, default=False, index=True)
    trade_notes = Column(String, nullable=True)

    collection = relationship("Collection", back_populates="cards")
    card_catalog = relationship("CartaScryfall", back_populates="instances_in_collections")