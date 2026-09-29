"""
Script para inicializar un usuario administrador/tester local.
Crea o actualiza el usuario y genera un JWT con validez extendida.
"""
from datetime import timedelta
from app.database import SessionLocal
from app.models.user import User
from app.core.security import create_access_token

def seed_test_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin_tester").first()
        
        if not user:
            user = User(
                username="admin_tester",
                email="admin@example.com",
                phone_number="+573009876543",
                location="Medellín / Bello, Antioquia",
                is_phone_verified=True,
                reputation_score=100,
                rating=5.0,
                completed_trades=10,
                disputes_count=0
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"[SEED] Usuario creado con éxito: {user.username} (ID: {user.id})")
        else:
            user.is_phone_verified = True
            db.commit()
            print(f"[SEED] Usuario existente actualizado: {user.username} (ID: {user.id})")

        # Generar un JWT de prueba válido por 30 días para pruebas locales
        token = create_access_token(
            user_id=str(user.id),
            expires_delta=timedelta(days=30)
        )

        print("\n" + "=" * 60)
        print("DATOS DE SESIÓN TESTER:")
        print(f"Username     : {user.username}")
        print(f"Teléfono     : {user.phone_number}")
        print(f"Token (JWT)  :\n{token}")
        print("=" * 60 + "\n")

    finally:
        db.close()

if __name__ == "__main__":
    seed_test_user()