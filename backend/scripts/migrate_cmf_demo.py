"""Copy configuration and OMS data from CMF_Demo into the local CES database."""
import os
import re
from datetime import time
from urllib.parse import unquote, urlparse

import psycopg2
from minio import Minio
from minio.commonconfig import CopySource
from psycopg2.extras import RealDictCursor

SOURCE = dict(
    host=os.environ["CMF_HOST"],
    dbname=os.environ["CMF_DB"],
    user=os.environ["CMF_USER"],
    password=os.environ["CMF_PASSWORD"],
)
TARGET = os.environ.get("CES_DATABASE_URL", "postgresql://postgres:1234@localhost:5432/ces")
MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "172.18.7.91:9000")
MINIO_ACCESS = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "ces-documents")
CREATED_BY = 1


def clip(value, length):
    if value is None:
        return None
    text = str(value).strip()
    return text[:length]


def safe_segment(value):
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", (value or "file").strip())
    return cleaned or "file"


def as_setup(value):
    if isinstance(value, time):
        return value.strftime("%H:%M:%S")
    text = str(value or "00:00:00")
    parts = text.split(":")
    if len(parts) == 2:
        return f"{int(parts[0]):02d}:{int(parts[1]):02d}:00"
    if len(parts) >= 3:
        return f"{int(parts[0]):02d}:{int(parts[1]):02d}:{int(float(parts[2])):02d}"
    return "00:00:00"


def as_cycle(value):
    text = str(value or "00:00")
    parts = text.split(":")
    hours = int(float(parts[0])) if parts and parts[0] else 0
    minutes = int(float(parts[1])) if len(parts) > 1 else 0
    if minutes > 59:
        hours += minutes // 60
        minutes = minutes % 60
    return f"{hours:02d}:{minutes:02d}"


def parse_minio_url(url):
    parsed = urlparse(url)
    path = unquote(parsed.path).lstrip("/")
    bucket, _, object_name = path.partition("/")
    return bucket, object_name


def main():
    source = psycopg2.connect(**SOURCE)
    target = psycopg2.connect(TARGET)
    source.autocommit = False
    target.autocommit = False
    src = source.cursor(cursor_factory=RealDictCursor)
    dst = target.cursor()

    minio_client = Minio(MINIO_ENDPOINT, access_key=MINIO_ACCESS, secret_key=MINIO_SECRET, secure=False)
    if not minio_client.bucket_exists(MINIO_BUCKET):
        minio_client.make_bucket(MINIO_BUCKET)

    dst.execute(
        """
        TRUNCATE TABLE
            document,
            operation,
            part,
            assembly,
            product,
            machine_mhr_value,
            machine,
            work_center,
            mhr_particular,
            customer,
            part_type
        RESTART IDENTITY CASCADE
        """
    )

    src.execute("SELECT * FROM configuration.customers ORDER BY id")
    for row in src.fetchall():
        dst.execute(
            """
            INSERT INTO customer (id, company_name, branch, address, contact_person, email, contact_number, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, COALESCE(%s, now()), COALESCE(%s, now()))
            """,
            (
                row["id"], clip(row["company_name"], 255), clip(row["branch"], 255), row["address"],
                clip(row["contact_person"], 255), clip(row["email"], 255), clip(row["contact_number"], 50),
                row["created_at"], row["updated_at"],
            ),
        )

    src.execute("SELECT * FROM configuration.work_centers ORDER BY id")
    work_centers = src.fetchall()
    for row in work_centers:
        dst.execute(
            """
            INSERT INTO work_center (id, code, name, description, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, now(), now())
            """,
            (
                row["id"], clip(row["code"], 50), clip(row["work_center_name"], 255),
                row["description"] or None, bool(row["is_schedulable"]),
            ),
        )

    src.execute("SELECT * FROM configuration.machines ORDER BY id")
    machines = src.fetchall()
    machine_ids = set()
    for row in machines:
        name = " ".join(part for part in [row["make"], row["model"]] if part).strip() or row["type"] or f"Machine {row['id']}"
        dst.execute(
            """
            INSERT INTO machine (
                id, work_center_id, name, machine_code, type, make, model,
                year_of_installation, cnc_controller, cnc_controller_service, remarks,
                mhr, recommended_mhr, mhr_calculated_at, is_active, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, true, now(), now())
            """,
            (
                row["id"], row["work_center_id"], clip(name, 255), f"M{row['id']}",
                clip(row["type"], 100), clip(row["make"], 100), clip(row["model"], 100),
                row["year_of_installation"], clip(row["cnc_controller"], 255),
                clip(row["cnc_controller_service"], 255), row["remarks"], row["mhr"],
                row["recommended_mhr"], row["mhr_calculated_at"],
            ),
        )
        machine_ids.add(row["id"])

    src.execute("SELECT * FROM configuration.mhr_particulars ORDER BY id")
    particular_ids = set()
    for row in src.fetchall():
        dst.execute(
            """
            INSERT INTO mhr_particular (
                id, code, name, is_input, formula, default_sequence, unit, is_active, created_by, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s, now()), now())
            """,
            (
                row["id"], clip(row["code"], 50), clip(row["name"], 255), row["is_input"], row["formula"],
                row["default_sequence"], clip(row["unit"], 50), row["is_active"], CREATED_BY, row["created_at"],
            ),
        )
        particular_ids.add(row["id"])

    src.execute("SELECT * FROM configuration.machine_mhr_values ORDER BY id")
    mhr_values = 0
    for row in src.fetchall():
        if row["machine_id"] not in machine_ids or row["particular_id"] not in particular_ids:
            continue
        dst.execute(
            """
            INSERT INTO machine_mhr_value (
                id, machine_id, particular_id, is_applicable, input_value, computed_value, updated_by, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, now(), COALESCE(%s, now()))
            """,
            (
                row["id"], row["machine_id"], row["particular_id"], row["is_applicable"],
                row["input_value"], row["computed_value"], CREATED_BY, row["updated_at"],
            ),
        )
        mhr_values += 1

    src.execute("SELECT * FROM oms.part_types ORDER BY id")
    for row in src.fetchall():
        dst.execute(
            """
            INSERT INTO part_type (id, name, created_by, created_at, updated_at)
            VALUES (%s, %s, %s, COALESCE(%s, now()), COALESCE(%s, now()))
            """,
            (row["id"], clip(row["type_name"], 255), CREATED_BY, row["created_at"], row["updated_at"]),
        )

    src.execute("SELECT * FROM oms.products ORDER BY id")
    product_ids = set()
    for row in src.fetchall():
        dst.execute(
            """
            INSERT INTO product (
                id, product_number, product_name, quantity, version, description, created_by, created_at, updated_at
            )
            VALUES (%s, %s, %s, 1, %s, NULL, %s, COALESCE(%s, now()), COALESCE(%s, now()))
            """,
            (
                row["id"], f"PRD-{row['id']}", clip(row["product_name"], 255),
                clip(row["product_version"] or "1", 50), CREATED_BY, row["created_at"], row["updated_at"],
            ),
        )
        product_ids.add(row["id"])

    src.execute("SELECT * FROM oms.assemblies WHERE COALESCE(recycle_bin, false) = false ORDER BY id")
    assemblies = [row for row in src.fetchall() if row["product_id"] in product_ids]
    assembly_ids = {row["id"] for row in assemblies}
    pending = assemblies[:]
    inserted_assemblies = set()
    while pending:
        progress = False
        next_pending = []
        for row in pending:
            parent_id = row["parent_id"] if row["parent_id"] in assembly_ids else None
            if parent_id and parent_id not in inserted_assemblies:
                next_pending.append(row)
                continue
            dst.execute(
                """
                INSERT INTO assembly (
                    id, product_id, parent_assembly_id, assembly_number, assembly_name, created_by, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, COALESCE(%s, now()), COALESCE(%s, now()))
                """,
                (
                    row["id"], row["product_id"], parent_id,
                    clip(row["assembly_number"] or f"ASM-{row['id']}", 50),
                    clip(row["assembly_name"], 255), CREATED_BY, row["created_at"], row["updated_at"],
                ),
            )
            inserted_assemblies.add(row["id"])
            progress = True
        if not progress:
            raise RuntimeError("Could not resolve assembly parents")
        pending = next_pending

    src.execute("SELECT * FROM oms.parts WHERE COALESCE(recycle_bin, false) = false ORDER BY id")
    part_numbers = {}
    part_count = 0
    for row in src.fetchall():
        if row["product_id"] not in product_ids:
            continue
        assembly_id = row["assembly_id"] if row["assembly_id"] in inserted_assemblies else None
        qty = row["qty"] if row["qty"] and row["qty"] > 0 else 1
        dst.execute(
            """
            INSERT INTO part (
                id, product_id, assembly_id, part_type_id, part_number, part_name,
                description, size, quantity, created_by, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s, now()), COALESCE(%s, now()))
            """,
            (
                row["id"], row["product_id"], assembly_id, row["type_id"],
                clip(row["part_number"] or f"PART-{row['id']}", 50), clip(row["part_name"], 255),
                row["part_detail"], clip(row["size"], 100), qty, CREATED_BY,
                row["created_at"], row["updated_at"],
            ),
        )
        part_numbers[row["id"]] = clip(row["part_number"] or f"PART-{row['id']}", 50)
        part_count += 1

    work_center_ids = {row["id"] for row in work_centers}
    src.execute("SELECT * FROM oms.operations ORDER BY id")
    operation_count = 0
    skipped_operations = 0
    for row in src.fetchall():
        if row["part_id"] not in part_numbers:
            skipped_operations += 1
            continue
        if row["workcenter_id"] not in work_center_ids or row["machine_id"] not in machine_ids:
            skipped_operations += 1
            continue
        dst.execute(
            """
            INSERT INTO operation (
                id, part_id, operation_number, operation_name, operation_type,
                work_center_id, machine_id, setup_time, cycle_time, work_instructions, notes,
                created_by, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, 'in_house', %s, %s, %s, %s, %s, %s, %s, COALESCE(%s, now()), COALESCE(%s, now()))
            """,
            (
                row["id"], row["part_id"], clip(row["operation_number"] or "10", 50),
                clip(row["operation_name"], 255), row["workcenter_id"], row["machine_id"],
                as_setup(row["setup_time"]), as_cycle(row["cycle_time"]),
                row["work_instructions"], row["notes"], CREATED_BY, row["created_at"], row["updated_at"],
            ),
        )
        operation_count += 1

    src.execute(
        """
        SELECT * FROM oms.documents
        WHERE part_id IS NOT NULL
        ORDER BY id
        """
    )
    copied = 0
    failed = 0
    for row in src.fetchall():
        if row["part_id"] not in part_numbers or not row["document_url"]:
            continue
        extension = "pdf"
        object_bucket, object_name = parse_minio_url(row["document_url"])
        if "." in object_name:
            extension = object_name.rsplit(".", 1)[-1].lower()[:10]
        doc_type = "3d" if str(row["document_type"] or "").lower().startswith("3") or extension in {"stl", "step", "stp"} else "2d"
        version = clip(row["document_version"] or "1", 50)
        file_name = clip(row["document_name"] or object_name.rsplit("/", 1)[-1], 200)
        if "." not in file_name:
            file_name = f"{file_name}.{extension}"
        dest_name = f"parts/{safe_segment(part_numbers[row['part_id']])}/v{safe_segment(version)}/{safe_segment(file_name)}"
        try:
            minio_client.copy_object(
                MINIO_BUCKET,
                dest_name,
                CopySource(object_bucket, object_name),
            )
            copied += 1
        except Exception as exc:
            failed += 1
            print(f"document {row['id']} copy failed: {exc}")
            continue
        dst.execute(
            """
            INSERT INTO document (
                id, part_id, assembly_id, file_name, file_type, document_type, version,
                file_path, uploaded_by, created_at, updated_at
            )
            VALUES (%s, %s, NULL, %s, %s, %s, %s, %s, %s, COALESCE(%s, now()), COALESCE(%s, now()))
            """,
            (
                row["id"], row["part_id"], clip(file_name, 255), extension, doc_type, version,
                dest_name, CREATED_BY, row["created_at"], row["updated_at"],
            ),
        )

    for table in [
        "customer", "work_center", "machine", "mhr_particular", "machine_mhr_value",
        "part_type", "product", "assembly", "part", "operation", "document",
    ]:
        dst.execute(
            f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1), true)"
        )

    target.commit()
    print(
        f"Migrated products={len(product_ids)} assemblies={len(inserted_assemblies)} "
        f"parts={part_count} operations={operation_count} skipped_operations={skipped_operations} "
        f"documents_copied={copied} documents_failed={failed} mhr_values={mhr_values} "
        f"machines={len(machine_ids)} work_centers={len(work_centers)}"
    )
    source.close()
    target.close()


if __name__ == "__main__":
    main()
