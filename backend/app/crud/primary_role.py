from sqlalchemy.orm import Session
from app.models.primary_role import PrimaryRole


def get_all_roles(db: Session):
    return db.query(PrimaryRole).all()


def get_role_by_name(db: Session, name: str):
    return db.query(PrimaryRole).filter(PrimaryRole.name == name).first()


def create_role(db: Session, name: str):
    role = PrimaryRole(name=name)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role
