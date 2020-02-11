# ehr-extraction-web

A visualization and annotation tool for extractive summarization of electronic health records.

## Setup

    pip install -r requirements.txt
    python -m spacy download en_core_web_sm

## Run

To run the server:

    python <script_name> <interface_dir> [-f <file> OR -d <data_dir>] [-a annotator_identifier]

where `<script_name>` is `validate_extraction.py`, `<interface_dir>` is the directory to the properly set up `ehr-extraction-models` repository from https://github.com/dmcinerney/ehr-extraction-models, `<file>` optionally loads a particular file to the web interface, and `<data_dir>` optionally loads files from a directory to the interface.
