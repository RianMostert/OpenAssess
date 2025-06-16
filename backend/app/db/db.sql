CREATE TABLE "user" (
  "id" UUID PRIMARY KEY,
  "first_name" varchar NOT NULL,
  "last_name" varchar NOT NULL,
  "email" varchar UNIQUE NOT NULL,
  "student_number" varchar UNIQUE,
  "password_hash" varchar NOT NULL,
  "role" varchar NOT NULL,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "course" (
  "id" UUID PRIMARY KEY,
  "title" varchar NOT NULL,
  "teacher_id" UUID,
  "code" varchar UNIQUE,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "assessment" (
  "id" UUID PRIMARY KEY,
  "title" varchar,
  "course_id" UUID,
  "blank_file_path" text,
  "upload_date" timestamp DEFAULT (now()),
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "uploaded_file" (
  "id" UUID PRIMARY KEY,
  "assessment_id" UUID,
  "student_id" UUID,
  "file_path" text NOT NULL,
  "uploaded_by" UUID,
  "uploaded_at" timestamp DEFAULT (now())
);

CREATE TABLE "question" (
  "id" UUID PRIMARY KEY,
  "assessment_id" UUID,
  "question_number" varchar NOT NULL,
  "max_marks" float,
  "increment" float,
  "memo" text,
  "marking_note" text,
  "page_number" int,
  "x" float,
  "y" float,
  "width" float,
  "height" float,
  "created_at" timestamp DEFAULT (now()),
  "updated_memo_at" timestamp
);

CREATE TABLE "question_result" (
  "id" UUID PRIMARY KEY,
  "student_id" UUID,
  "assessment_id" UUID,
  "question_id" UUID,
  "marker_id" UUID,
  "mark" float,
  "comment" text,
  "file_path" text,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE UNIQUE INDEX ON "uploaded_file" ("assessment_id", "student_id");

CREATE UNIQUE INDEX ON "question_result" ("assessment_id", "student_id", "question_id");

ALTER TABLE "course" ADD FOREIGN KEY ("teacher_id") REFERENCES "user" ("id");

ALTER TABLE "assessment" ADD FOREIGN KEY ("course_id") REFERENCES "course" ("id");

ALTER TABLE "uploaded_file" ADD FOREIGN KEY ("assessment_id") REFERENCES "assessment" ("id");

ALTER TABLE "uploaded_file" ADD FOREIGN KEY ("student_id") REFERENCES "user" ("id");

ALTER TABLE "uploaded_file" ADD FOREIGN KEY ("uploaded_by") REFERENCES "user" ("id");

ALTER TABLE "question" ADD FOREIGN KEY ("assessment_id") REFERENCES "assessment" ("id");

ALTER TABLE "question_result" ADD FOREIGN KEY ("student_id") REFERENCES "user" ("id");

ALTER TABLE "question_result" ADD FOREIGN KEY ("assessment_id") REFERENCES "assessment" ("id");

ALTER TABLE "question_result" ADD FOREIGN KEY ("question_id") REFERENCES "question" ("id");

ALTER TABLE "question_result" ADD FOREIGN KEY ("marker_id") REFERENCES "user" ("id");
