from os import walk
from os.path import join, exists
import subprocess
import pandas as pd
import pickle as pkl
from argparse import ArgumentParser
from tqdm import tqdm
from pytt.utils import read_pickle, write_pickle

def ancestors(parents, start, nodes, stop_nodes=set()):
    node_stack = copy.deepcopy(nodes)
    new_nodes = set()
    while len(node_stack) > 0:
        node = node_stack.pop()
        if node in stop_nodes: continue # don't add stop nodes
        if node in new_nodes: continue # don't add nodes already there
        if node == start: continue # don't add the start node
        new_nodes.add(node)
        node_stack.extend([parents[node]])
    return list(new_nodes)

# limit_to is one of the following:
#   'all' for all instances
#   'annotations' for instances that have at least one annotation
#   <annotation_subdirectory> for instances present in the annotation subdirectory
def instances_to_data(instances_dir, output_data_dir, limit_to='annotations', custom=False):
    subprocess.run(["mkdir", output_data_dir])
    output_data_file = join(output_data_dir, 'supervised.data')
    output_hierarchy_file = join(output_data_dir, 'hierarchy.pkl')
    if limit_to == 'all':
        raise NotImplementedError
    elif limit_to == 'annotations':
        subdirectories = next(iter(walk(instances_dir)))[1]
        instances = {}
        global_info = None
        old_to_new = {}
        for dir in subdirectories:
            if custom:
                global_info_file = join(instances_dir, dir, 'global_info.pkl')
                if exists(global_info_file):
                    global_info, old_to_new = merge(global_info, read_pickle(global_info_file))
            if not dir.endswith('_annotations'): continue
            annotations = next(iter(walk(join(instances_dir, dir))))[2]
            annotations = set(annotations)
            for annotation_file in annotations:
                if not annotation_file.startswith('instance_'): continue
                idx = int(annotation_file[len('instance_'):-len('.pkl')])
                if idx not in instances.keys():
                    instances[idx] = read_pickle(join(
                        instances_dir, annotation_file))
                    instances[idx]['annotations'] = {}
                instances[idx]['annotations'][dir] = convert_annotations(
                    read_pickle(join(instances_dir, dir, annotation_file)), old_to_new)
        for k,v in list(instances.items()):
            new_targets = list(set([target for annotator in v['annotations'].values() for target in annotator['past-reports']['tag_sentences'].keys()
                                    if custom or not target.startswith("custom")]))
            if len(new_targets) == 0:
                del instances[k]
                continue
            new_targets = ancestors(global_info["start"], global_info["parents"], new_targets)
            instances[k]['targets'] = new_targets
            instances[k]['labels'] = [1 for t in new_targets]
        pd.DataFrame(instances).transpose().to_csv(output_data_file, compression='gzip')
        if custom:
            write_pickle(global_info["hierarchy"], output_hierarchy_file)
    else:
        # TODO: set file generator for the subdirectory's instances
        raise NotImplementedError

def merge(global_info1, global_info2):
    if global_info1 is None:
        return global_info2, {}
    g1h = global_info1["hierarchy"]
    g1c = global_info1["custom_tags"]
    g2h = global_info2["hierarchy"]
    g2c = global_info2["custom_tags"]
    offset = len(g1c)
    old_to_new = {}
    for i,custom_tag in enumerate(g2c):
        new_name = "custom"+str(offset+i)
        old_to_new[custom_tag] = new_name
        g1c.append(new_name)
    for old,new in old_to_new.items():
        oparent = g2h["parents"][old]
        nparent = newnode(old_to_new, oparent)
        g1h["parents"][new] = nparent
        if nparent not in g1h["options"]:
            g1h["options"][nparent] = []
        g1h["options"][nparent].append(new)
        g1h["indices"][new] = len(g1h["options"][nparent])-1
        g1h["descriptions"][new] = g2h["descriptions"][old]
    return global_info1, old_to_new

def convert_annotations(annotations, old_to_new):
    for k1,v1 in annotations.items():
        v1['tag_sentences'] = {newnode(old_to_new, k2):v2 for k2,v2 in v1['tag_sentences'].items()}
    return annotations

def newnode(old_to_new, old):
    return old_to_new[old] if old in old_to_new.keys() else old

if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('instances_dir')
    parser.add_argument('output_data_dir')
    parser.add_argument('-l', '--limit_to', default='annotations',
                        help="""limit_to options: 'all' for all instances,
                             'annotations' for instances that have at least one annotation,
                             <annotation_subdirectory> for instances present in the annotation subdirectory""")
    parser.add_argument('-c', '--custom', action='store_true', help='include the custom tags')
    args = parser.parse_args()
    instances_to_data(args.instances_dir, args.output_data_dir, limit_to=args.limit_to, custom=args.custom)
