from os import listdir, mkdir
from os.path import isfile, join, exists
from apps.annotate_extraction import app, startup
from argparse import ArgumentParser
from utils import directory

class FileGenerator:
    def __init__(self, data_dir, annotations_dir):
        self.data_dir = data_dir
        self.annotations_dir = annotations_dir
        data_files = self.get_files(data_dir)
        annotation_files = self.get_files(annotations_dir)
        self.files_to_annotate = data_files.difference(annotation_files)

    def get_files(self, dir):
        return set([f for f in listdir(dir) if isfile(join(dir, f))])

    def __iter__(self):
        return self

    def __next__(self):
        return join(self.data_dir, self.files_to_annotate.pop())

if __name__=='__main__':
    parser = ArgumentParser()
    parser.add_argument('interface_dir')
    parser.add_argument('-f', '--file')
    parser.add_argument('-d', '--data_dir')
    parser.add_argument('-i', '--interface', default='interface')
    args = parser.parse_args()
    if args.file is not None and args.data_dir is not None:
        raise Exception
    startup['file'] = args.file
    startup['annotations_dir'] = join(args.data_dir if args.data_dir is not None else '.', 'annotations_annotate')
    if not exists(startup['annotations_dir']):
        mkdir(startup['annotations_dir'])
    startup['file_generator'] = FileGenerator(args.data_dir, startup['annotations_dir']) if args.data_dir is not None else None
    with directory(args.interface_dir):
        exec('import '+args.interface)
    startup['interface'] = eval(args.interface).TokenizerInterface()
    app.run(debug=True)
