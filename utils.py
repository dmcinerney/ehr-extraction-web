from contextlib import contextmanager
import sys
import os

@contextmanager
def directory(new_dir):
    path = sys.path[0]
    current_path_files = [os.path.join(path,file) for file in os.listdir()]
    names = [name for name,module in sys.modules.items() if hasattr(module, '__file__') and module.__file__ in current_path_files]
    newnames = [path+name for name in names]
    replace_keys(sys.modules, names, newnames)

    sys.path.insert(0, new_dir)

    original_dir = os.getcwd()
    os.chdir(new_dir)
    yield
    os.chdir(original_dir)

    del sys.path[0]

    replace_keys(sys.modules, newnames, names)


def replace_keys(dictionary, old_keys, new_keys):
    for old_key,new_key in zip(old_keys, new_keys):
        dictionary[new_key] = dictionary[old_key]
        del dictionary[old_key]
