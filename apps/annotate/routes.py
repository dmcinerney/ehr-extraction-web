from os.path import basename
from . import app, startup
from flask import request, render_template, send_file, make_response
from werkzeug import secure_filename
import pandas as pd

@app.route('/', methods=['GET'])
def index():
    print(startup['file'])
    return render_template(
        'index.html',
        file_from_server="false" if startup["file"] is None else "true",
        queries=startup['interface'].get_queries(),
        file=basename(startup["file"]) if startup["file"] else False,
        tabs=[('future-reports', 'Future Reports', 'annotate the reports from the 12 month window after the first mr','annotate', 0),
              ('past-reports', 'Past Reports', 'annotate the last (up to) 100 reports before the first mr', 'annotate', 0),
              ('model-summaries', 'Model Summaries', 'validate the model summaries of the past reports', 'validate', 0)]
    )

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
    import pdb; pdb.set_trace()
    tab_results = [results]
    patient_mrn = str(reports["patient_id"].iloc[0])
    return {"tab_results":tab_results, "patient_mrn":patient_mrn}

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

@app.route('/query', methods=['POST'])
def query_article():
    query = request.form['query']
    is_nl = request.form['is_nl'] == 'true'
    if startup["file"] is None:
        f = request.files['article']
        filename = 'uploads/' + secure_filename(f.filename)
        f.save(filename)
    elif isinstance(startup["file"], str):
        filename = startup['file']
    else:
        raise Exception
    reports = pd.read_csv(filename, parse_dates=['date'])
    results = startup['interface'].query_reports(reports, query, is_nl=is_nl)
    results['original_reports'] = [(i,report.report_type,str(report.date),report.text) for i,report in results['original_reports'].iterrows()]
    threshold = .5
    extracted = {k:[i for i,sent in enumerate(results['tokenized_text'][:len(results['heatmaps'][k])]) if sum(results['heatmaps'][k][i]) > threshold] for k in results['heatmaps'].keys()}
    results['extracted'] = extracted
    if 'score' in results.keys():
        print(results['score'])
    return results
