import os
import pandas as pd
import pickle as pkl
from argparse import ArgumentParser

if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('data_file')
    parser.add_argument('output_dir')
    args = parser.parse_args()
    os.mkdir(args.output_dir)
    df = pd.read_csv(args.data_file, compression='gzip')
    for i,row in df.iterrows():
        instance_file = os.path.join(args.output_dir, 'instance_%i.pkl' % i)
        with open(instance_file, 'wb') as f:
            pkl.dump(row.to_dict(), f)
