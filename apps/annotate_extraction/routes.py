from os.path import basename
from . import app, startup
from flask import request, render_template, send_file, make_response
from werkzeug import secure_filename
import pandas as pd

@app.route('/', methods=['GET'])
def index():
    print(startup['file'])
    return render_template('index.html', file_from_server="false" if startup["file"] is None else "true", queries=startup['interface'].get_queries(), file=basename(startup["file"]) if startup["file"] else False)

@app.route('/get_file', methods=['POST'])
def get_file():
    if startup["file"] is None:
        f = request.files['reports']
        filename = 'uploads/' + secure_filename(f.filename)
        f.save(filename)
    elif isinstance(startup["file"], str):
        filename = startup['file']
    else:
        raise Exception
    reports = pd.read_csv(filename, parse_dates=['date'])
    results = startup['interface'].tokenize(reports)
    results['original_reports'] = [(i,report.report_type,str(report.date),report.text) for i,report in results['original_reports'].iterrows()]
    results['filename'] = basename(startup['file'])
    return results

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
