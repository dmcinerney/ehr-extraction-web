from os.path import basename
from . import app, startup
from flask import request, render_template, send_file, make_response
from werkzeug import secure_filename
import pandas as pd
import pickle as pkl
import random

@app.route('/', methods=['GET'])
def index():
    print(startup['file'])
    tabs = [
        ('future-reports', 'Future Reports', 'annotate the reports from the 12 month window after the first mr','annotate', 1, None, True),
        ('past-reports', 'Past Reports', 'annotate the last (up to) 100 reports before the first mr', 'annotate', 0, None, True),
    ]
    models = startup['interface'].get_models()
    random.shuffle(models)
    print(models)
    startup['curr_models'] = {}
    for i,k in enumerate(models):
        valid_queries = startup['interface'].get_valid_queries(k)
        with_custom = startup['interface'].with_custom(k)
        tabs.append(('model-%i-summaries' % (i+1), 'Model %i Summaries' % (i+1), 'validate the model summaries of the past reports', 'validate', 0, valid_queries, with_custom))
        startup['curr_models']['model-%i-summaries' % (i+1)] = k
    progress = startup['file_generator'].progress()
    num_instances = len(startup['file_generator'])
    file_from_server = "false" if startup["file"] is None else "true"
    descriptions = startup['interface'].get_descriptions()
    hierarchy = startup['interface'].get_hierarchy()
    file = basename(startup["file"]) if startup["file"] else False
    tabs = tabs
    return render_template(
        'index.html',
        progress=progress,
        num_instances=num_instances,
        file_from_server=file_from_server,
        descriptions=descriptions,
        hierarchy=hierarchy,
        file=file,
        tabs=tabs,
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
    with open(filename, 'rb') as f:
        instance = pkl.load(f)
    targets = eval(instance['targets'])
    labels = eval(instance['labels'])
    positive_targets = [target for i,target in enumerate(targets) if labels[i]]
    print(positive_targets)
    reports = pd.DataFrame(eval(instance['reports']))
    reports['date'] = pd.to_datetime(reports['date'])
    results1 = startup['interface'].tokenize(reports)
    results1['original_reports'] = [(i,report.report_type,str(report.date),report.text) for i,report in results1['original_reports'].iterrows()]
    future_reports = pd.DataFrame(eval(instance['future_reports']))
    future_reports['date'] = pd.to_datetime(future_reports['date'])
    results2 = startup['interface'].tokenize(future_reports, num_sentences=None)
    results2['original_reports'] = [(i,report.report_type,str(report.date),report.text) for i,report in results2['original_reports'].iterrows()]
    startup['tab_reports'] = [reports, future_reports]
    startup['tab_results'] = [results1, results2]
    patient_mrn = str(reports["patient_id"].iloc[0])
    return {"tab_results":startup['tab_results'], "patient_mrn":patient_mrn, "positive_targets":positive_targets}

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
    index = int(request.form['index'])
    model = startup['curr_models'][request.form['model']]
    print(model)
    results = startup['interface'].query_reports(model, startup['tab_reports'][index], query, is_nl=is_nl)
    threshold = .5
    tokenized_text = startup['tab_results'][index]['tokenized_text']
    extracted = {k:[i for i,sent in enumerate(tokenized_text[:len(results['heatmaps'][k])]) if sum(results['heatmaps'][k][i]) > threshold] for k in results['heatmaps'].keys()}
    results['extracted'] = extracted
    if 'score' in results.keys():
        print(results['score'])
    return results
