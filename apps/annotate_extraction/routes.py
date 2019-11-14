from os.path import basename
from . import app, startup
from flask import request, render_template, send_file, make_response
from werkzeug import secure_filename

@app.route('/', methods=['GET'])
def index():
    print(startup['file'])
    return render_template('index.html', file_from_server="false" if startup["file"] is None else "true", queries=startup['interface'].get_queries(), file=basename(startup["file"]) if startup["file"] else False)

@app.route('/get_file/<file>', methods=['GET'])
def get_file(file):
    print(file)
    response = make_response(send_file(startup['file']))
    response.headers['filename'] = basename(startup['file'])
    print(startup['file'])
    return response

@app.route('/', methods=['POST'])
def annotate():
    print(request.form)
    # record annotations
    if startup['file_generator'] is None:
        startup['file'] = None
    else:
        try:
            startup['file'] = next(startup['file_generator'])
        except StopIteration:
            startup['file'] = False
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
    results = startup['interface'].tokenize(text)
    return results
