from sqlalchemy.orm import Session
from app.models.role import Role


def get_all_roles(db: Session):
    return db.query(Role).all()


def get_role_by_name(db: Session, name: str):
    return db.query(Role).filter(Role.name == name).first()


def create_role(db: Session, name: str):
    role = Role(name=name)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role
