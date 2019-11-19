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
    }
    disableQuery(){
        $("#query").attr("disabled", true);
    }
    enableQuery(){
        $("#query").attr("disabled", false);
    }
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
            //displayTokenizedReports();
            state.enableQuery();
            closeLoader(d3.select("body").select("#loader_div"));
        },
        processData: false,
        contentType: false,
    });
}


function chooseQuery() {
    url = 'http://localhost:5000/query'
    var formData = new FormData();
    var query_selector = document.getElementById("query");
    if (query_selector.options[query_selector.selectedIndex].value == 'default') { alert("no query selected"); return; }
    formData.append("query", query_selector.options[query_selector.selectedIndex].value);
    if (!file_from_server) {
        var x = document.getElementById("reports_file");
        formData.append("reports", x.files[0]);
    }
    displayLoader(d3.select("body").select("#loader_div"));
    $.post({
        url: url,
        data: formData,
        success: function(result, status){
            current_result = result; // TODO: just change whatever you have in the current result
            displayHeatmap();
            closeLoader(d3.select("body").select("#loader_div"));
        },
        processData: false,
        contentType: false,
    });
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

// Note: taken from https://github.com/abisee/attn_vis/blob/master/index.html
greenhue = 151
yellowhue = 56
function toColor(p, hue) {
    // converts a scalar value p in [0,1] to a HSL color code string with base color hue
    if (p<0 || p>1) {
      throw sprintf("Error: p has value %.2f but should be in [0,1]", p)
    }
    var saturation = 100; // saturation percentage
    p = 1-p; // invert so p=0 is light and p=1 is dark
    var min_lightness = 50; // minimum percentage lightness, i.e. darkest possible color
    var lightness = (min_lightness + p*(100-min_lightness)); // lightness is proportional to p
    return sprintf('hsl(%d,%s%%,%s%%)', hue, saturation, lightness);
}

function displayHeatmap() {
    changeHeatmap();
}

const arrSum = arr => arr.reduce((a,b) => a + b, 0)

function changeHeatmap() {
    var heatmap = 'sentence_level_attention'
    d3.selectAll(".reports_sentence")
      .style("background-color", function(d){
        var sentence_attention = current_result.heatmaps[heatmap][d[1][0]]
        return toColor(arrSum(sentence_attention), greenhue); });
    displayExtracted();
}

function displayExtracted(){
    var heatmap = 'sentence_level_attention'
    var summary = d3.select("body").select("#summary_div").select("p");
    summary.html("");
    summary_sentence_div = summary.selectAll("p")
      .data(current_result.extracted[heatmap])
      .enter()
      .append("div")
        .attr("class", "summary_sentence_div");
    summary_sentence_div
      .append("p")
        .style("display", "inline")
        .each(function(d) {
          d3.select("#sentence_"+d[0])
            .style("border", "3px")
            .style("border-color", "#000000")
            .style("border-style", "solid"); })
        .on("click", function(d) {
          var sentence = d3.select("#sentence_"+d[0]);
          d3.select("#report").node().selectedIndex = sentence.attr("report_id");
          chooseReport();
          sentence.node().scrollIntoView({block: "center"}); })
        .attr("class", "summary_sentence")
        .selectAll("text")
        .data(function(d) { return d[1]; })
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
              .style("display","inline")
              .html(word); });
    summary_sentence_div
      .append("input")
        .attr("type", "checkbox")
        .style("display", "inline");
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
            location.reload(true);
        },
        processData: false,
        contentType: false,
    });
}
