from os import mkdir
from os.path import join, exists
from apps.annotate import app, startup
from argparse import ArgumentParser
from utils import directory
from file_generator import FileGenerator

if __name__=='__main__':
    parser = ArgumentParser()
    parser.add_argument('interface_dir')
    #parser.add_argument('-f', '--file')
    parser.add_argument('-d', '--data_dir')
    parser.add_argument('-a', '--annotator', default='default')
    parser.add_argument('-i', '--interface', default='interface')
    parser.add_argument('-m','--models', action='append')
    args = parser.parse_args()
    if args.data_dir is None:
        raise NotImplementedError
    startup['annotations_dir'] = join(args.data_dir, args.annotator+"_annotations")
    if not exists(startup['annotations_dir']):
        mkdir(startup['annotations_dir'])
    startup['file_generator'] = FileGenerator(args.data_dir, startup['annotations_dir'])
    startup['file'] = next(startup['file_generator'])
    with directory(args.interface_dir):
        exec('import '+args.interface)
    startup['interface'] = eval(args.interface).FullModelInterface(models_to_load=args.models)
    app.run(debug=True)
