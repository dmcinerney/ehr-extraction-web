from . import app, startup
from flask import request, render_template
from werkzeug import secure_filename

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html', file_from_server="false" if startup["file"] is None else "true", queries=startup['interface'].get_queries())

@app.route('/', methods=['POST'])
def annotate():
    print(request.form)
    # record annotations
    if startup['file_generator'] is None:
        startup['file'] = None
    else:
        startup['file'] = next(startup['file_generator'])
    print("getting file:", startup['file'])
    return {}

@app.route('/tokenize', methods=['POST'])
def tokenize_article():
    if startup["file"] is None:
        f = request.files['article']
        filename = 'uploads/' + secure_filename(f.filename)
        f.save(filename)
    elif isinstance(startup["file"], str):
        filename = startup['file']
    else:
        raise Exception
    text = ""
    with open(filename, 'r') as f:
        for line in f:
            text += line
    return {'tokenized_text': startup['interface'].tokenize(text)}
