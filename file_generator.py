from os import listdir
from os.path import isfile, join, abspath


class FileGenerator:
    def __init__(self, data_dir, annotations_dir):
        self.data_dir = data_dir
        self.annotations_dir = annotations_dir
        data_files = self.get_files(data_dir)
        annotated_files = self.get_files(annotations_dir).intersection(data_files)
        self.files_to_annotate = sorted(list(data_files.difference(annotated_files)))
        self.annotated_files = list(annotated_files)
        self.length = len(data_files)

    def get_files(self, dir):
        return set([f for f in listdir(dir) if isfile(join(dir, f))])

    def __iter__(self):
        return self

    def previous(self):
        if len(self.annotated_files) == 0:
            raise Exception
        self.files_to_annotate.insert(0, self.annotated_files.pop(-1))
        if len(self.annotated_files) == 0:
            raise Exception
        return abspath(join(self.data_dir, self.annotated_files[-1]))

    def __next__(self):
        if len(self.files_to_annotate) == 0:
            raise StopIteration
        self.annotated_files.append(self.files_to_annotate.pop(0))
        return abspath(join(self.data_dir, self.annotated_files[-1]))

    def __len__(self):
        return self.length

    def progress(self):
        return len(self.annotated_files)
