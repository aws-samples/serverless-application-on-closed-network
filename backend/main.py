import json

from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# following setting alllows all methods and http header.
# do NOT use on production.
CORS(app, supports_credentials=True)


@app.route("/")
def home():
    return json.dumps({"message": "Hello from ECS!"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
