# ehr-extraction-web

A visualization and annotation tool for extractive summarization of electronic health records.

## Setup

    pip install -r requirements.txt
    python -m spacy download en_core_web_sm

## Run

To run the server:

    python annotate.py [-h] [-a ANNOTATOR] [-i INTERFACE] [-m MODELS]
                       interface_dir data_dir

where `interface_dir` is the directory to the properly set up `ehr-extraction-models` repository from https://github.com/dmcinerney/ehr-extraction-models, `data_dir` loads files from a directory to the interface, `ANNOTATOR` is the annotator identifier, `interface` is the name of the file in the `interface_dir` that contains the interface (defaults to `"interface"`), and `MODELS`, for each time the flag appears, appends the string as a model to load.
