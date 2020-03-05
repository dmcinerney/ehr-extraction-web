from os import listdir
from os.path import isfile, join, abspath, exists
from pytt.utils import read_pickle, write_pickle
from tqdm import tqdm
import numpy as np
import pandas as pd

def create_patient_dict(data_dir):
    instance_files = get_files(data_dir).difference(set(['patient_to_instances.pkl']))
    patient_dict = {}
    for instance_file in tqdm(instance_files):
        instance = read_pickle(join(data_dir, instance_file))
        mrn = pd.DataFrame(eval(instance['reports'])).patient_id.iloc[0]
        #labels = eval(instance['labels'])
        #pos = set([c for i,c in enumerate(eval(instance['targets'])) if labels[i] == 1])
        #if '191' not in pos: continue
        if mrn not in patient_dict.keys():
            patient_dict[mrn] = set([])
        patient_dict[mrn].add(instance_file)
    write_pickle(patient_dict, join(data_dir, 'patient_to_instances.pkl'))
    return patient_dict

def get_files(dir):
    return set([f for f in listdir(dir) if isfile(join(dir, f))])

class FileGenerator:
    def __init__(self, data_dir, annotations_dir, reload=False):
        self.data_dir = data_dir
        self.annotations_dir = annotations_dir
        patient_dict_file = join(data_dir, 'patient_to_instances.pkl')
        self.patient_dict = read_pickle(patient_dict_file)\
                            if exists(patient_dict_file) and not reload else\
                            create_patient_dict(data_dir)
        self.instance_ordering = self.create_instance_ordering()
        annotated_files_set = get_files(annotations_dir).difference(set(['global_info.pkl']))
        annotated_files = []
        files_to_annotate = []
        for instance in self.instance_ordering:
            if instance in annotated_files_set:
                annotated_files.append(instance)
            else:
                files_to_annotate.append(instance)
        self.instances = annotated_files + files_to_annotate
        self.curr_index = len(annotated_files) - 1
        self.length = len(self.instances)

    def create_instance_ordering(self):
        patient_instances = {k:list(v) for k,v in self.patient_dict.items()}
        patients, num_instances = zip(*[(k,len(v)) for k,v in patient_instances.items()])
        patients, num_instances = list(patients), list(num_instances)
        probs = np.array(num_instances)/sum(num_instances)
        ordering = []
        while len(patient_instances) > 0:
            patient_idx = np.random.choice(len(patients), p=probs)
            patient = patients[patient_idx]
            instances = patient_instances[patient]
            instance_idx = np.random.choice(len(instances))
            ordering.append(instances[instance_idx])
            del instances[instance_idx]
            if len(instances) == 0:
                del patient_instances[patient]
                del patients[patient_idx]
                probs = probs.tolist()
                del probs[patient_idx]
                probs = np.array(probs)/sum(probs)
        return ordering

    def __iter__(self):
        return self

    def previous(self):
        if self.curr_index <= 0:
            raise Exception
        self.curr_index -= 1
        return abspath(join(self.data_dir, self.instances[self.curr_index]))

    def __next__(self):
        if self.curr_index >= len(self.instances)-1:
            raise StopIteration
        self.curr_index += 1
        return abspath(join(self.data_dir, self.instances[self.curr_index]))

    def __len__(self):
        return self.length

    def progress(self):
        return self.curr_index + 1
