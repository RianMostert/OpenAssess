CREATE TABLE "users" (
  "id" UUID PRIMARY KEY,
  "username" varchar UNIQUE NOT NULL,
  "email" varchar UNIQUE NOT NULL,
  "password_hash" varchar NOT NULL,
  "role" varchar NOT NULL,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "courses" (
  "id" UUID PRIMARY KEY,
  "title" varchar NOT NULL,
  "teacher_id" UUID,
  "code" varchar UNIQUE,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "assessments" (
  "id" UUID PRIMARY KEY,
  "title" varchar,
  "course_id" UUID,
  "blank_file_path" text,
  "upload_date" timestamp DEFAULT (now()),
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "assessment_files" (
  "id" UUID PRIMARY KEY,
  "assessment_id" UUID,
  "student_id" UUID,
  "file_path" text NOT NULL,
  "uploaded_by" UUID,
  "uploaded_at" timestamp DEFAULT (now())
);

CREATE TABLE "students" (
  "id" UUID PRIMARY KEY,
  "student_number" varchar UNIQUE NOT NULL,
  "first_name" varchar,
  "last_name" varchar,
  "email" varchar,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "questions" (
  "id" UUID PRIMARY KEY,
  "assessment_id" UUID,
  "question_number" varchar NOT NULL,
  "sub_question" varchar,
  "max_marks" float,
  "increment" float,
  "memo" text,
  "extra_info" text,
  "page_number" int,
  "x" float,
  "y" float,
  "width" float,
  "height" float,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "marks" (
  "id" UUID PRIMARY KEY,
  "student_id" UUID,
  "assessment_id" UUID,
  "question_id" UUID,
  "marker_id" UUID,
  "mark" float,
  "comment" text,
  "marked_at" timestamp DEFAULT (now()),
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "question_annotations" (
  "id" UUID PRIMARY KEY,
  "assessment_id" UUID,
  "question_id" UUID,
  "student_id" UUID,
  "file_path" text NOT NULL,
  "uploaded_by" UUID,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE UNIQUE INDEX ON "assessment_files" ("assessment_id", "student_id");

CREATE UNIQUE INDEX ON "marks" ("assessment_id", "student_id", "question_id");

CREATE UNIQUE INDEX ON "question_annotations" ("assessment_id", "student_id", "question_id");

ALTER TABLE "courses" ADD FOREIGN KEY ("teacher_id") REFERENCES "users" ("id");

ALTER TABLE "assessments" ADD FOREIGN KEY ("course_id") REFERENCES "courses" ("id");

ALTER TABLE "assessment_files" ADD FOREIGN KEY ("assessment_id") REFERENCES "assessments" ("id");

ALTER TABLE "assessment_files" ADD FOREIGN KEY ("student_id") REFERENCES "students" ("id");

ALTER TABLE "assessment_files" ADD FOREIGN KEY ("uploaded_by") REFERENCES "users" ("id");

ALTER TABLE "questions" ADD FOREIGN KEY ("assessment_id") REFERENCES "assessments" ("id");

ALTER TABLE "marks" ADD FOREIGN KEY ("student_id") REFERENCES "students" ("id");

ALTER TABLE "marks" ADD FOREIGN KEY ("assessment_id") REFERENCES "assessments" ("id");

ALTER TABLE "marks" ADD FOREIGN KEY ("question_id") REFERENCES "questions" ("id");

ALTER TABLE "marks" ADD FOREIGN KEY ("marker_id") REFERENCES "users" ("id");

ALTER TABLE "question_annotations" ADD FOREIGN KEY ("assessment_id") REFERENCES "assessments" ("id");

ALTER TABLE "question_annotations" ADD FOREIGN KEY ("question_id") REFERENCES "questions" ("id");

ALTER TABLE "question_annotations" ADD FOREIGN KEY ("student_id") REFERENCES "students" ("id");

ALTER TABLE "question_annotations" ADD FOREIGN KEY ("uploaded_by") REFERENCES "users" ("id");
