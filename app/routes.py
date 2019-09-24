from app import app, startup
from flask import request, render_template
from werkzeug import secure_filename

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'GET':
        return render_template('index.html', file=startup['file'], queries=startup['interface'].get_queries())
    query = request.form['query']
    if startup['file'] == "":
        f = request.files['article']
        filename = 'uploads/' + secure_filename(f.filename)
        f.save(filename)
    else:
        filename = startup['file']
    text = ""
    with open(filename, 'r') as f:
        for line in f:
            text += line
    return startup['interface'].query_text(text, query)
