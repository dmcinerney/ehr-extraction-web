from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

startup = {
    'file':"",
    'interface':None
}

from app import routes
