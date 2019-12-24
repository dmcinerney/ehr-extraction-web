from os import listdir
from os.path import isfile, join, abspath


class FileGenerator:
    def __init__(self, data_dir, annotations_dir):
        self.data_dir = data_dir
        self.annotations_dir = annotations_dir
        data_files = self.get_files(data_dir)
        annotation_files = self.get_files(annotations_dir)
        self.files_to_annotate = sorted(list(data_files.difference(annotation_files)))
        self.length = len(data_files)

    def get_files(self, dir):
        return set([f for f in listdir(dir) if isfile(join(dir, f))])

    def __iter__(self):
        return self

    def __next__(self):
        if len(self.files_to_annotate) == 0:
            raise StopIteration
        return abspath(join(self.data_dir, self.files_to_annotate.pop(0)))

    def __len__(self):
        return self.length

    def progress(self):
        return len(self) - len(self.files_to_annotate)
