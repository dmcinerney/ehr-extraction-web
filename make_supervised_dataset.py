import os
import pandas as pd
import pickle as pkl
from argparse import ArgumentParser
from tqdm import tqdm

# limit_to is one of the following:
#   'all' for all instances
#   'annotations' for instances that have at least one annotation
#   <annotation_subdirectory> for instances present in the annotation subdirectory
def instances_to_data(instances_dir, output_data_file, limit_to='all'):
    if limit_to == 'all':
        instances = os.listdir(instances_dir)
        import pdb; pdb.set_trace()
        pass
    elif limit_to == 'annotations':
        pass
    else:
        # TODO: set file generator for the subdirectory's instances
        pass

if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('instances_dir')
    parser.add_argument('output_data_file')
    parser.add_argument('-l', '--limit_to', default='all',
                        help="""limit_to options: 'all' for all instances,
                             'annotations' for instances that have at least one annotation,
                             <annotation_subdirectory> for instances present in the annotation subdirectory""")
    args = parser.parse_args()
    instances_to_data(args.instances_dir, args.output_data_file, limit_to=args.limit_to)
