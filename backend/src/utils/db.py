import psycopg2
from psycopg2.extras import RealDictCursor, execute_batch
from contextlib import contextmanager
from typing import Generator, Optional
import json

class Database:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string

    @contextmanager
    def get_connection(self):
        conn = psycopg2.connect(self.connection_string)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @contextmanager
    def get_cursor(self, connection=None):
        if connection:
            cursor = connection.cursor(cursor_factory=RealDictCursor)
        else:
            conn = psycopg2.connect(self.connection_string)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            connection = conn

        try:
            yield cursor
        finally:
            if connection:
                connection.close()

    def fetch_all(self, query: str, params: tuple = ()) -> list:
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()

    def fetch_one(self, query: str, params: tuple = ()) -> Optional[dict]:
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchone()

    def execute(self, query: str, params: tuple = ()) -> int:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return cursor.rowcount

    def batch_insert(self, table: str, rows: list, batch_size: int = 5000):
        if not rows:
            return 0

        columns = rows[0].keys()
        placeholders = ','.join(['%s'] * len(columns))
        columns_str = ','.join(columns)
        query = f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders})"

        values = [tuple(row[col] for col in columns) for row in rows]

        with self.get_connection() as conn:
            cursor = conn.cursor()
            execute_batch(cursor, query, values, page_size=batch_size)
            return len(values)

    def log_rejection(self, conn, source_row_num: int, reason: str, raw_values: dict):
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO data_quality_log (source_row_num, rejection_reason, raw_values) VALUES (%s, %s, %s)",
            (source_row_num, reason, json.dumps(raw_values))
        )