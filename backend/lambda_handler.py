"""AWS Lambda entrypoint for PaperBoi FastAPI using Mangum."""
from mangum import Mangum

from backend.main import app

handler = Mangum(app)
