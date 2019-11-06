# ehr-extraction-web

A visualization and annotation tool for extractive summarization of electronic health records.

## Run

To run the server:

    python <script_name> <interface_directory> -i <interface>

where `<script_name>` is `validate_extraction.py`, `<interface_directory>` is the directory to the properly set up `ehr-extraction-model` repository from https://github.com/dmcinerney/ehr-extraction-models, and `<interface>` controls which interface in that repository is used (defaults to `interface`).
