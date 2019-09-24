from app import app, startup
from argparse import ArgumentParser
from utils import directory


if __name__=='__main__':
    parser = ArgumentParser()
    parser.add_argument('interface_dir')
    parser.add_argument('-f', '--file')
    parser.print_help()
    args = parser.parse_args()
    if args.file is not None:
        startup['file'] = args.file
    with directory(args.interface_dir):
        import interface
    startup['interface'] = interface
    app.run(debug=True)
