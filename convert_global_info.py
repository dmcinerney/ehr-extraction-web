from pytt.utils import read_pickle, write_pickle
from argparse import ArgumentParser

if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('file')
    args = parser.parse_args()
    global_info = read_pickle(args.file)
    global_info["hierarchy"]["descriptions"] = global_info["descriptions"]
    write_pickle(global_info, args.file)
