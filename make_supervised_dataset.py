import copy
from os.path import join
import subprocess
from argparse import ArgumentParser
import json
import pandas as pd
from pytt.utils import read_pickle, write_pickle

def annotations_to_data(annotations_data_dir, output_data_dir, custom=False):
    subprocess.run(["mkdir", output_data_dir])
    output_data_file = join(output_data_dir, 'supervised.data')
    output_hierarchy_file = join(output_data_dir, 'hierarchy.pkl')
    instances = pd.read_csv(join(annotations_data_dir, 'annotations.data'), compression='gzip')
    hierarchy = read_pickle(join(annotations_data_dir, 'hierarchy.pkl'))
    rows = []
    for i,row in instances.iterrows():
        new_targets = list(set([target for annotator in json.loads(row.annotations).values() if 'past-reports' in annotator.keys() for target in annotator['past-reports']['tag_sentences'].keys()
                                if custom or not target.startswith("custom")]))
        if len(new_targets) == 0: continue
        new_row = copy.deepcopy(row)
        new_row.targets = new_targets
        new_row.labels = [1 for t in new_targets]
        rows.append(new_row)
    pd.DataFrame(rows).to_csv(output_data_file, compression='gzip')
    if custom:
        write_pickle(hierarchy, output_hierarchy_file)

if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('annotations_data_dir')
    parser.add_argument('output_data_dir')
    parser.add_argument('-c', '--custom', action='store_true', help='include the custom tags')
    args = parser.parse_args()
    annotations_to_data(args.annotations_data_dir, args.output_data_dir, custom=args.custom)
