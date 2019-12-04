var current_result = null;
var state = null;
$(document).ready(function(){
    state = new State();
    if (file_from_server) {
        loadReports();
    }
});

class State {
    constructor() {
        this.query_keys = Object.keys(queries);
        var query_indices = {};
        this.query_keys.forEach(function(e, i) { query_indices[e] = i; } );
        this.query_indices = query_indices;
        this.populateTagSelector(d3.select("#tag"));
        this.tag_sentences = {};
    }
    disableVis(){
        d3.selectAll(".column")
          .classed("disabled", true)
          .selectAll("*")
          .classed("disabled", true);
        d3.select("#tag").classed("disabled", true);
    }
    enableVis(){
        d3.selectAll(".column")
          .classed("disabled", false)
          .selectAll("*")
          .classed("disabled", false);
        d3.select("#tag").classed("disabled", false);
    }
    populateTagSelector(tag_selector, default_option="Select a Tag") {
        tag_selector.html("");
        tag_selector.append("option")
          .attr("value", "default")
          .html(default_option)
          .attr("disabled", true);
        tag_selector.selectAll(".tags")
          .data(this.query_keys)
          .enter()
          .append("option")
            .attr("value", function(d) { return d; })
            .html(function(d) { return d + ": " + queries[d]; });
        $("#"+tag_selector.attr("id")).selectpicker('refresh');
    }
}

function sortNumber(a, b) {
    return a - b;
}


function loadReports() {
    var reports_text_div = d3.select("#reports_div").select(".custom_text");
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
            alert("Select a file.");
        } else {
            getFile();
        }
        event.preventDefault();
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
            populateReportSelector();
            makeReports();
            chooseReport();
            closeLoader(d3.select("#loader_div"));
        },
        processData: false,
        contentType: false,
    });
}

function chooseTag() {
    chooseQuery();
}

function populateReportSelector() {
    d3.select("#report")
      .selectAll("option")
      .data(current_result.original_reports)
      .enter()
      .append("option")
        .attr("value", function(d) { return d[0]; })
        .html(function(d) { return d[0]+'. '+d[1]+', '+d[2]; })
    $("#report").selectpicker('refresh');
}

function nextReport() {
    d3.select("#report").node().selectedIndex = d3.select("#report").node().selectedIndex+1;
    chooseReport();
}

function previousReport() {
    d3.select("#report").node().selectedIndex = d3.select("#report").node().selectedIndex-1;
    chooseReport();
}

function chooseReport() {
    var report = document.getElementById("report").selectedIndex;
    d3.select("#reports_div").select(".custom_text").selectAll(".report_p")
      .classed("selected", function(d, i) { return i == report; });
    d3.select("#previous").classed("disabled", d3.select("#report").node().selectedIndex == 0);
    d3.select("#next").classed("disabled", d3.select("#report").node().selectedIndex == current_result.original_reports.length-1);
    $("#report").selectpicker('refresh');
}

function makeReports() {
    var reports_text_div = d3.select("#reports_div").select(".custom_text");
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
      .append("text")
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
      .append("text")
        .attr("id", function(d) { return "sentence_"+d[1][0]; })
        .attr("selected", "false")
        .attr("class", "reports_sentence")
        .attr("report_id", function(d) { return d[0]; })
        .html(function(d) {
          return current_result.original_reports[d[0]][3].slice(d[1][1], d[1][2]); });

    // Add anything in original report after the last sentence
    report_p.append("div")
      .append("text")
      .html(function(d, i) {
        var start = current_result.sentence_spans[i][current_result.sentence_spans[i].length-1][2];
        var end = current_result.original_reports[i][3].length;
        return current_result.original_reports[i][3].slice(start, end); });
}


function highlightMomentarily(selection) {
    selection
      .interrupt("highlightMomentarily");
    var original_color = selection.style("border-color");
    selection
      .style("border-color", "red")
      .transition("highlightMomentarily").duration(2000)
      .on("interrupt", function(){ selection.style("border-color", null); })
      .on("end", function(){ selection.style("border-color", null); })
      .style("border-color", original_color);
}

function displayTokenizedSummary() {
    var summary = d3.select("#summary_div").select(".custom_text");
    summary.html("");
    summary_p = summary.selectAll("p")
      .data(Object.keys(state.tag_sentences))
      .enter()
      .append("p")
        .attr("class", "summary_p")
        .attr("id", function(d) { return "tag_"+d; });
    summary_p.append("p")
      .attr("class", "tagheader")
      .html(function(d) { return d + ": " + queries[d]; });
    sentence_p = summary_p.selectAll(".summary_sentence")
      .data(function(d) { return Array.from(state.tag_sentences[d]).sort(sortNumber).map(function(e){ return [d, e]; }); })
      .enter()
      .append("p")
        .attr("class", "summary_sentence")
        .attr("id", function(d) { return "summary_sentence_"+d[0]+"_"+d[1]; })
        .attr("tag", function(d) { return d[0]; })
        .attr("sentence", function(d) { return d[1]; });
    sentence_p.append("div")
      .attr("class", "summary_sentence_text")
      .on("click", function(d) {
        var sentence = d3.select("#sentence_"+d[1]);
        d3.select("#report").node().selectedIndex = sentence.attr("report_id");
        chooseReport();
        sentence.node().scrollIntoView({block: "center"});
        highlightMomentarily(sentence); })
      .selectAll("div")
      .data(function(d) { return current_result.tokenized_text[d[1]]; })
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
    checkbox_container = sentence_p.append("div")
      .attr("class", "custom-control custom-checkbox form-control-lg");
    checkbox_container.append("input")
      .attr("type", "checkbox")
      .attr("class", "custom-control-input")
      .attr("id", function(d) { return "checkbox_"+d[0]+"_"+d[1]; });
    checkbox_container.append("label")
      .attr("class", "custom-control-label")
      .attr("for", function(d) { return "checkbox_"+d[0]+"_"+d[1]; });
}

function displayLoader(selection) {
    selection.append("div")
        .attr("class", "loader");
}

function closeLoader(selection) {
    selection.selectAll(".loader").remove();
}

function submit() {
    url = 'http://localhost:5000/'
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

function chooseQuery() {
    url = 'http://localhost:5000/query';
    var formData = new FormData();
    var tag_selector = document.getElementById("tag");
    var tag = tag_selector.options[tag_selector.selectedIndex].value;
    if (tag == 'default') { alert("no query selected"); return; }
    formData.append("query", tag);
    if (!file_from_server) {
        var x = document.getElementById("reports_file");
        formData.append("reports", x.files[0]);
    }
    displayLoader(d3.select("#loader_div"));
    $.post({
        url: url,
        data: formData,
        success: function(result, status){
            current_result = result; // TODO: just change whatever you have in the current result
            displayModelAnnotations();
            displayTokenizedSummary();
            closeLoader(d3.select("#loader_div"));
        },
        processData: false,
        contentType: false,
    });
}

const arrSum = arr => arr.reduce((a,b) => a + b, 0);

function displayModelAnnotations() {
    var tag_selector = document.getElementById("tag");
    var tag = tag_selector.options[tag_selector.selectedIndex].value;
    var heatmap = 'sentence_level_attention';
    state.tag_sentences = {}
    state.tag_sentences[tag] = new Set(current_result.extracted[heatmap]);
    d3.selectAll(".reports_sentence")
      .style("background-color", function(d){
        if (d[1][0] > current_result.heatmaps[heatmap].length-1) { return "lightgrey";}
        var sentence_attention = current_result.heatmaps[heatmap][d[1][0]];
        console.log(sentence_attention);
        console.log(d[1][0]);
        return toColor(arrSum(sentence_attention), greenhue); })
      .classed("selected", function(d) { return state.tag_sentences[tag].has(d[1][0]); })
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
