import os
import pandas as pd
import pickle as pkl
from argparse import ArgumentParser
from tqdm import tqdm

def data_to_instances(data_file, output_instances_dir):
    os.mkdir(output_dir)
    df = pd.read_csv(data_file, compression='gzip')
    for i,row in tqdm(df.iterrows(), total=len(df)):
        instance_file = os.path.join(output_dir, 'instance_%i.pkl' % i)
        with open(instance_file, 'wb') as f:
            pkl.dump(row.to_dict(), f)


if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('data_file')
    parser.add_argument('output_instances_dir')
    args = parser.parse_args()
    data_to_instances(args.data_file, args.output_instances_dir)
