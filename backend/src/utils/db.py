import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor, execute_batch
from contextlib import contextmanager
from typing import Generator, Optional
import json

class Database:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.is_sqlite = connection_string.startswith('sqlite://') or connection_string.endswith('.db')

    @contextmanager
    def get_connection(self):
        if self.is_sqlite:
            db_path = self.connection_string.replace('sqlite://', '')
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
        else:
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
        if self.is_sqlite:
            if connection:
                cursor = connection.cursor()
            else:
                db_path = self.connection_string.replace('sqlite://', '')
                conn = sqlite3.connect(db_path)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                connection = conn
            try:
                yield cursor
            finally:
                if connection and not connection:
                    connection.close()
        else:
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

    def _convert_query(self, query: str) -> str:
        """Convert query placeholders from %s (PostgreSQL) to ? (SQLite) if needed"""
        if self.is_sqlite:
            return query.replace('%s', '?')
        return query

    def fetch_all(self, query: str, params: tuple = ()) -> list:
        query = self._convert_query(query)
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            if self.is_sqlite:
                return [dict(row) for row in cursor.fetchall()]
            return cursor.fetchall()

    def fetch_one(self, query: str, params: tuple = ()) -> Optional[dict]:
        query = self._convert_query(query)
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            result = cursor.fetchone()
            if self.is_sqlite and result:
                return dict(result)
            return result

    def execute(self, query: str, params: tuple = ()) -> int:
        query = self._convert_query(query)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return cursor.rowcount

    def batch_insert(self, table: str, rows: list, batch_size: int = 5000):
        if not rows:
            return 0

        columns = rows[0].keys()
        if self.is_sqlite:
            placeholders = ','.join(['?'] * len(columns))
        else:
            placeholders = ','.join(['%s'] * len(columns))
        columns_str = ','.join(columns)
        query = f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders})"

        values = [tuple(row[col] for col in columns) for row in rows]

        with self.get_connection() as conn:
            cursor = conn.cursor()
            if self.is_sqlite:
                for batch_start in range(0, len(values), batch_size):
                    batch = values[batch_start:batch_start + batch_size]
                    cursor.executemany(query, batch)
            else:
                execute_batch(cursor, query, values, page_size=batch_size)
            return len(values)

    def log_rejection(self, conn, source_row_num: int, reason: str, raw_values: dict):
        cursor = conn.cursor()
        if self.is_sqlite:
            cursor.execute(
                "INSERT INTO data_quality_log (rejection_reason, raw_values, timestamp) VALUES (?, ?, datetime('now'))",
                (reason, json.dumps(raw_values))
            )
        else:
            cursor.execute(
                "INSERT INTO data_quality_log (source_row_num, rejection_reason, raw_values) VALUES (%s, %s, %s)",
                (source_row_num, reason, json.dumps(raw_values))
            )