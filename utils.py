from contextlib import contextmanager
import sys
import os

@contextmanager
def directory(new_dir):
    original_dir = os.getcwd()
    os.chdir(new_dir)
    sys.path.insert(1, new_dir)
    yield
    del sys.path[1]
    os.chdir(original_dir)
