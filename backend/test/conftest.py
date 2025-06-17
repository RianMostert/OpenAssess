import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.dependencies import get_db
from fastapi.testclient import TestClient
from app.main import app
from app.models import user as user_model
from app.models import course as course_model
from app.models import assessment as assessment_model
from app.models import uploaded_file as uploaded_file_model
from app.models import question as question_model
from app.models import question_result as question_result_model
import uuid

# Use your dedicated test database
TEST_DATABASE_URL = "postgresql://rianmostert:password@localhost:5432/mytestdb"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)


@pytest.fixture(scope="function")
def db_session():
    connection = engine.connect()
    transaction = connection.begin()

    session = TestingSessionLocal(bind=connection)
    yield session

    session.close()
    transaction.rollback()
    connection.close()


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


# --------------------------
# Entity Fixtures
# --------------------------


@pytest.fixture
def teacher(db_session):
    user = user_model.User(
        id=uuid.uuid4(),
        first_name="Test",
        last_name="Teacher",
        email="teacher@example.com",
        student_number="T123456",
        password_hash="hashed",
        role="teacher",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def student(db_session):
    user = user_model.User(
        id=uuid.uuid4(),
        first_name="Test",
        last_name="Student",
        email="student@example.com",
        student_number="S123456",
        password_hash="hashed",
        role="student",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def marker(db_session):
    user = user_model.User(
        id=uuid.uuid4(),
        first_name="Test",
        last_name="Marker",
        email="marker@example.com",
        student_number="M123456",
        password_hash="hashed",
        role="ta",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def course(db_session, teacher):
    course = course_model.Course(
        id=uuid.uuid4(), title="Test Course", teacher_id=teacher.id, code="TEST101"
    )
    db_session.add(course)
    db_session.commit()
    return course


@pytest.fixture
def assessment(db_session, course):
    assessment = assessment_model.Assessment(
        id=uuid.uuid4(),
        title="Test Assessment",
        course_id=course.id,
        question_paper_file_path="/files/test.pdf",
    )
    db_session.add(assessment)
    db_session.commit()
    return assessment


@pytest.fixture
def uploaded_file(db_session, assessment, student, teacher):
    uploaded = uploaded_file_model.UploadedFile(
        id=uuid.uuid4(),
        assessment_id=assessment.id,
        student_id=student.id,
        answer_sheet_file_path="/files/answer.pdf",
        uploaded_by=teacher.id,
    )
    db_session.add(uploaded)
    db_session.commit()
    return uploaded


@pytest.fixture
def question(db_session, assessment):
    q = question_model.Question(
        id=uuid.uuid4(),
        assessment_id=assessment.id,
        question_number="1",
        max_marks=10.0,
        increment=0.5,
        memo="Answer X",
        page_number=1,
    )
    db_session.add(q)
    db_session.commit()
    return q


@pytest.fixture
def question_result(db_session, assessment, question, student, marker):
    result = question_result_model.QuestionResult(
        id=uuid.uuid4(),
        student_id=student.id,
        assessment_id=assessment.id,
        question_id=question.id,
        marker_id=marker.id,
        mark=7.5,
        comment="Well done",
        file_path="/annotations/q1.json",
    )
    db_session.add(result)
    db_session.commit()
    return result
