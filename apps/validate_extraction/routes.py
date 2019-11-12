from . import app, startup
from flask import request, render_template
from werkzeug import secure_filename

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html', file_from_server="false" if startup["file"] is None else "true", queries=startup['interface'].get_queries())

@app.route('/get_file', methods=['GET'])
def get_file():
    print("getting file:", startup['file'])

@app.route('/', methods=['POST'])
def query_article():
    query = request.form['query']
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
    results = startup['interface'].query_text(text, query)
    threshold = .5
    extracted = {k:[[i,sent] for i,sent in enumerate(results['tokenized_text'][:len(results['heatmaps'][k])]) if sum(results['heatmaps'][k][i]) > threshold] for k in results['heatmaps'].keys()}
    results['extracted'] = extracted
    print(results['score'])
    print(results['extracted'])
    return results
