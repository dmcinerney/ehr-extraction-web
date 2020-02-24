from os import mkdir
from os.path import join, exists
from apps.annotate import app, startup
from argparse import ArgumentParser
from utils import directory
from file_generator import FileGenerator
import numpy as np

if __name__=='__main__':
    parser = ArgumentParser()
    parser.add_argument('interface_dir')
    #parser.add_argument('-f', '--file')
    #parser.add_argument('-d', '--data_dir')
    parser.add_argument('data_dir')
    parser.add_argument('-a', '--annotator', default='default')
    parser.add_argument('-i', '--interface', default='interface')
    parser.add_argument('-m','--models', action='append')
    parser.add_argument('-d','--device', default='cpu')
    parser.add_argument('-r','--reload', default=False, action='store_true')
    parser.add_argument('-p','--port')
    args = parser.parse_args()
    if args.data_dir is None:
        raise NotImplementedError
    startup['annotations_dir'] = join(args.data_dir, args.annotator+"_annotations")
    if not exists(startup['annotations_dir']):
        mkdir(startup['annotations_dir'])
    np.random.seed(0)
    startup['file_generator'] = FileGenerator(args.data_dir, startup['annotations_dir'], reload=args.reload)
    try:
        startup['file'] = next(startup['file_generator'])
    except StopIteration:
        startup['file'] = None
    with directory(args.interface_dir):
        exec('import '+args.interface)
    models_to_load = args.models if args.models is not None else []
    startup['interface'] = eval(args.interface).FullModelInterface(models_to_load=models_to_load, device=args.device)
    app.run(debug=True, port=args.port)
