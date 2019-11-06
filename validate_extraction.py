from apps.validate_extraction import app, startup
from argparse import ArgumentParser
from utils import directory

if __name__=='__main__':
    parser = ArgumentParser()
    parser.add_argument('interface_dir')
    parser.add_argument('-f', '--file')
    parser.add_argument('-i', '--interface', default='interface')
    args = parser.parse_args()
    if args.file is not None:
        startup['file'] = args.file
    with directory(args.interface_dir):
        exec('import '+args.interface)
    startup['interface'] = eval(args.interface)
    app.run(debug=True)
