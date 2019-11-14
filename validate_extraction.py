from os import mkdir
from os.path import join, exists
from apps.validate_extraction import app, startup
from argparse import ArgumentParser
from utils import directory
from file_generator import FileGenerator

if __name__=='__main__':
    parser = ArgumentParser()
    parser.add_argument('interface_dir')
    parser.add_argument('-f', '--file')
    parser.add_argument('-d', '--data_dir')
    parser.add_argument('-i', '--interface', default='interface')
    args = parser.parse_args()
    if args.file is not None and args.data_dir is not None:
        raise Exception
    startup['annotations_dir'] = join(args.data_dir if args.data_dir is not None else '.', 'annotations_validate')
    if not exists(startup['annotations_dir']):
        mkdir(startup['annotations_dir'])
    startup['file_generator'] = FileGenerator(args.data_dir, startup['annotations_dir']) if args.data_dir is not None else None
    startup['file'] = next(startup['file_generator']) if args.data_dir is not None else args.file
    with directory(args.interface_dir):
        exec('import '+args.interface)
    startup['interface'] = eval(args.interface).FullModelInterface()
    app.run(debug=True)
