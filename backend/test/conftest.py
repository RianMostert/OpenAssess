import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.dependencies import get_db
from fastapi.testclient import TestClient
from app.main import app

# Use your dedicated test database
TEST_DATABASE_URL = "postgresql://rianmostert:password@localhost:5432/mytestdb"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Ensure the schema is created once per test session
@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)


# Rollback after each test
@pytest.fixture(scope="function")
def db_session():
    connection = engine.connect()
    transaction = connection.begin()

    session = TestingSessionLocal(bind=connection)
    yield session

    session.close()
    transaction.rollback()
    connection.close()


# Override FastAPI's get_db with the test session
@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
