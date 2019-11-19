var current_result = null;
var state = null;
$(document).ready(function(){
    state = new State(queries)
    if (file_from_server) {
        loadReports();
    }
});

class State {
    constructor(queries) {
        populateQuerySelector(queries);
        $('.fancy_select').select2();
        this.disableQuery();
        this.selected_sentences = new Set([]);
    }
    disableQuery(){
        $("#query").attr("disabled", true);
    }
    enableQuery(){
        $("#query").attr("disabled", false);
    }
    clickSentence(i){
        var selected = d3.select("#sentence_"+i).attr("selected");
        if (selected == "false") {
            this.selectSentence(i);
        } else {
            this.deselectSentence(i);
        }
        var selected_sentences = Array.from(this.selected_sentences);
        selected_sentences.sort(sortNumber);
        //displaySummary(selected_sentences);
        displayTokenizedSummary(selected_sentences);
    }
    selectSentence(i){
        var sentence = d3.select("#sentence_"+i);
        sentence.classed("highlighted", true);
        sentence.attr("selected", "true");
        this.selected_sentences.add(i);
    }
    deselectSentence(i){
        var sentence = d3.select("#sentence_"+i);
        sentence.classed("highlighted", false);
        sentence.attr("selected", "false");
        this.selected_sentences.delete(i);
    }
}

function sortNumber(a, b) {
    return a - b;
}


function loadReports() {
    var reports_text_div = d3.select("body").select("#reports_div").select("div");
    if (file_from_server) {
        // read in file here
        if (file == "False") {
            d3.select("body").html("Done!");
        } else {
            getFile();
        }
    } else {
        var x = document.getElementById("reports_file");
        reports_text_div.html("");
        if (x.files.length == 0) {
            state.disableQuery()
            alert("Select a file.");
        } else {
            getFile();
        }
        event.preventDefault();
    }
}

function populateQuerySelector(queries) {
    d3.select("body")
      .select("#query")
      .append("option")
        .attr("value", "default")
        .html("Select a Query");
    for (var key in queries) {
        if (queries.hasOwnProperty(key)) {
            d3.select("body")
              .select("#query")
              .append("option")
                .attr("value", key)
                .html(key + ": " + queries[key]);
        }
    }
}

function getFile() {
    url = 'http://localhost:5000/get_file';
    var formData = new FormData();
    if (!file_from_server) {
        var x = document.getElementById("reports_file");
        formData.append("reports", x.files[0]);
    }
    displayLoader(d3.select("#loader_div"));
    $.post({
        url: url,
        data: formData,
        success: function(result, status){
            current_result = result;
            populateReportSelector()
            makeReports();
            chooseReport();
            state.enableQuery();
            //displayTokenizedReports();
            closeLoader(d3.select("body").select("#loader_div"));
        },
        processData: false,
        contentType: false,
    });
}

function chooseQuery() {
    var query_selector = document.getElementById("query");
    if (query_selector.options[query_selector.selectedIndex].value == 'default') {
        alert("no query selected");
    }
}

function populateReportSelector() {
    d3.select("#report")
      .selectAll("option")
      .data(current_result.original_reports)
      .enter()
      .append("option")
        .attr("value", function(d) { return d[0]; })
        .html(function(d) { return d[0]+'. '+d[1]+', '+d[2]; });
}

function chooseReport() {
    var report_selector = document.getElementById("report");
    var report = report_selector.options[report_selector.selectedIndex].value
    d3.select("#reports_div").select("div").selectAll(".report_p")
      .classed("selected", function(d, i) { return i == report; })
}

function makeReports() {
    var reports_text_div = d3.select("#reports_div").select("div");
    reports_text_div.html("");
    var report_p = reports_text_div.selectAll("p")
      .data(current_result.sentence_spans)
      .enter()
      .append("p")
        .attr("class", "report_p");
    divs_for_sentence_and_in_between = report_p.selectAll("div")
      .data(function(d, i) { return d.map(function(e){ return [i, e]; }); })
      .enter()
      .append("div")
        .style("display", "inline");

    // Add anything in orginal report before the sentence
    divs_for_sentence_and_in_between
      .append("p")
        .style("display", "inline")
        .html(function(d, i) {
          if (i == 0) {
              var start = 0;
          } else {
              var start = current_result.sentence_spans[d[0]][i-1][2];
          }
          var end = d[1][1];
          return current_result.original_reports[d[0]][3].slice(start, end); });

    // Add the sentence
    divs_for_sentence_and_in_between
      .append("p")
        .style("display", "inline")
        .attr("id", function(d) { return "sentence_"+d[1][0]; })
        .attr("selected", "false")
        .attr("class", "reports_sentence")
        .attr("report_id", function(d) { return d[0]; })
        .on("click", function(d, i) { state.clickSentence(d[1][0]); })
        .html(function(d) {
          return current_result.original_reports[d[0]][3].slice(d[1][1], d[1][2]); });

    // Add anything in original report after the last sentence
    report_p.append("div")
      .append("p")
      .style("display", "inline")
      .html(function(d, i) {
        var start = current_result.sentence_spans[i][current_result.sentence_spans[i].length-1][2];
        var end = current_result.original_reports[i][3].length;
        return current_result.original_reports[i][3].slice(start, end); });
}


function displayTokenizedReports() {
    var reports_text_div = d3.select("body").select("#reports_div").select("div");
    reports_text_div.html("");
    reports_text_div.selectAll("p")
      .data(current_result.tokenized_text)
      .enter()
      .append("p")
        .attr("id", function(d, i) { return "sentence_"+i; })
        .attr("selected", "false")
        .attr("class", "reports_sentence")
        .on("click", function(d, i) { state.clickSentence(i); })
        .selectAll("text")
        .data(function(d) { return d; })
        .enter()
        .append("div")
          .style("display", "inline")
          .each(function(d, i) {
            var word = d;
            if (i > 0 && !word.startsWith('##')) {
                d3.select(this).append("text").html(' ');
            } else {
                if (word.startsWith('##')) {
                    word = word.slice(2);
                }
            }
            d3.select(this).append("text")
              .style("display", "inline")
              .html(word); });
}

function displayTokenizedSummary(data) {
    var summary = d3.select("body").select("#summary_div").select("p");
    summary.html("");
    summary.selectAll("p")
      .data(data)
      .enter()
      .append("p")
        .attr("id", function(d) { return "summary_sentence_"+d; })
        .attr("class", "summary_sentence")
        .on("click", function(d) {
          var sentence = d3.select("#sentence_"+d);
          d3.select("#report").node().selectedIndex = sentence.attr("report_id");
          chooseReport();
          sentence.node().scrollIntoView({block: "center"}); })
        .selectAll("text")
        .data(function(d) { return current_result.tokenized_text[d]; })
        .enter()
        .append("div")
          .style("display", "inline")
          .each(function(d, i) {
            var word = d;
            if (i > 0 && !word.startsWith('##')) {
                d3.select(this).append("text").html(' ');
            } else {
                if (word.startsWith('##')) {
                    word = word.slice(2);
                }
            }
            d3.select(this).append("text")
              .style("display", "inline")
              .html(word); });
}

function displayLoader(selection) {
    selection.append("div")
        .attr("class", "loader");
}

function closeLoader(selection) {
    selection.selectAll(".loader").remove();
}

function submit() {
    url = 'http://localhost:5000'
    var formData = new FormData();
    formData.append("hello", "world");
    $.post({
        url: url,
        data: formData,
        success: function(result, status){
            location.reload();
        },
        processData: false,
        contentType: false,
    });
}
