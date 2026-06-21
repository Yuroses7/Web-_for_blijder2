from sqlalchemy import create_engine, MetaData
from databases import Database
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5432/caregiver_system_v2")

print(f"🔍 ACTUAL DATABASE_URL = {DATABASE_URL}")   # เพิ่มบรรทัดนี้

database = Database(DATABASE_URL)
engine = create_engine(DATABASE_URL)
metadata = MetaData()