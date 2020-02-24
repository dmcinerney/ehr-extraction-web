import json
from os.path import basename, join, exists
from . import app, startup
from flask import request, render_template, send_file, make_response
from werkzeug import secure_filename
import pandas as pd
from pytt.utils import read_pickle, write_pickle
import pickle as pkl
import random


# tabs template:
# (id, name, description, type, which_reports, trained_queries, with_custom, is_future)
# type - 'validate' or 'annotate'
# which_reports - Reports and corresponding results are stored in an array in the backend. This describes which index in the array that tab will display.  This will be static.
# trained_queries - which queries the model was trained on (for model tabs)
# with_custom - describes if the tab is allowed to use custom tags
# is_future - describes if the tab annotates future reports or past
@app.route('/', methods=['GET'])
def index():
    if startup['file'] is None:
        return render_template('done.html')
    print(startup['file'])
    tabs = [
        ('future-reports', 'Future Reports', 'annotate the reports from the 12 month window after the first mr','annotate', 1, None, True, True),
        ('past-reports', 'Past Reports', 'annotate the last 1000 sentences before the first mr in the past reports', 'annotate', 0, None, True, False),
    ]
    models = startup['interface'].get_models()
    random.shuffle(models)
    print(models)
    startup['curr_models'] = {}
    for i,k in enumerate(models):
        trained_queries = startup['interface'].get_trained_queries(k)
        with_custom = startup['interface'].with_custom(k)
        tabs.append(('model-%i-summaries' % (i+1), 'Model %i Summaries' % (i+1), 'validate the model summaries of the past reports', 'validate', 0, trained_queries, with_custom, False))
        startup['curr_models']['model-%i-summaries' % (i+1)] = k
    progress = startup['file_generator'].progress()
    num_instances = len(startup['file_generator'])
    file_from_server = "false" if startup["file"] is None else "true"
    if exists(join(startup['annotations_dir'], 'global_info.pkl')):
        global_info = read_pickle(join(startup["annotations_dir"], 'global_info.pkl'))
        descriptions = global_info['descriptions']
        hierarchy = global_info['hierarchy']
        custom_tags = global_info['custom_tags']
    else:
        descriptions = startup['interface'].get_descriptions()
        hierarchy = startup['interface'].get_hierarchy()
        custom_tags = []
    file = basename(startup["file"])
    print(file)
    tabs = tabs
    annotations = read_pickle(join(startup["annotations_dir"], file))\
                  if exists(join(startup["annotations_dir"], file)) else {}
    if isinstance(startup["file"], str):
        instance = read_pickle(startup['file'])
        reports = pd.DataFrame(eval(instance['reports']))
        patient_mrn = str(reports["patient_id"].iloc[0])
    else:
        patient_mrn = ""
    return render_template(
        'index.html',
        progress=progress,
        num_instances=num_instances,
        file_from_server=file_from_server,
        descriptions=descriptions,
        hierarchy=hierarchy,
        custom_tags=custom_tags,
        file=file,
        tabs=tabs,
        annotations=annotations,
        patient_mrn=patient_mrn,
    )

@app.route('/get_file', methods=['POST'])
def get_file():
    if startup["file"] is None: # Not currently used
        f = request.files['reports']
        filename = 'uploads/' + secure_filename(f.filename)
        f.save(filename)
    elif isinstance(startup["file"], str):
        filename = startup['file']
    else:
        raise Exception
    instance = read_pickle(filename)
    #import pdb; pdb.set_trace()
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
    return {"tab_results":startup['tab_results'], "positive_targets":positive_targets}


global_data = set(['custom_tags', 'descriptions', 'hierarchy'])

@app.route('/', methods=['POST'])
def annotate():
    # record annotations
    form_data = {k:json.loads(v) for k,v in request.form.items()}
    write_pickle({k:form_data[k] for k in global_data}, join(startup["annotations_dir"], 'global_info.pkl'))
    write_pickle({k if k not in startup['curr_models'].keys() else startup['curr_models'][k]:v for k,v in form_data.items() if k not in global_data},
                 join(startup["annotations_dir"], basename(startup["file"])))
    if startup['file_generator'] is None: # not currently used
        startup['file'] = None
    else:
        try:
            startup['file'] = next(startup['file_generator'])
        except StopIteration:
            startup['file'] = None
    return {}

@app.route('/query', methods=['POST'])
def query_article():
    query = request.form['query']
    is_nl = request.form['is_nl'] == 'true'
    index = int(request.form['index'])
    model = startup['curr_models'][request.form['model']]
    print(model)
    results = startup['interface'].query_reports(model, startup['tab_reports'][index], query, is_nl=is_nl)
    tokenized_text = startup['tab_results'][index]['tokenized_text']
#    threshold = .5
#    extracted = {k:[i for i,sent in enumerate(tokenized_text[:len(results['heatmaps'][k])]) if sum(results['heatmaps'][k][i]) > threshold] for k in results['heatmaps'].keys()}
    extracted = {k:topk([(i,sum(results['heatmaps'][k][i])) for i,sent in enumerate(tokenized_text[:len(results['heatmaps'][k])])], 10) for k in results['heatmaps'].keys()}
    results['extracted'] = extracted
    if 'score' in results.keys():
        print(results['score'])
    return results

def topk(index_score_list, k):
    return [i for i,s in sorted(index_score_list, key=lambda x: -x[1])[:k] if s > 0]

@app.route('/next', methods=['POST'])
def next_report():
    if startup['file_generator'] is None: # not currently used
        startup['file'] = None
    else:
        startup['file'] = next(startup['file_generator'])
    return {}

@app.route('/previous', methods=['POST'])
def previous_report():
    if startup['file_generator'] is None: # not currently used
        startup['file'] = None
    else:
        startup['file'] = startup['file_generator'].previous()
    return {}
