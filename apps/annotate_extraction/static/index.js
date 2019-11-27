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
        populateTagSelector(d3.select("#tag"));
        this.tag_sentences = {};
        this.sentence_tags = {};
        this.switchToTagSentences();
        this.selected_sentence = null;
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
    switchToTagSentences(){
        d3.select("#tag_sentences").classed("selected", true);
        d3.select("#sentence_tags").classed("selected", false);
    }
    switchToSentenceTags(){
        d3.select("#tag_sentences").classed("selected", false);
        d3.select("#sentence_tags").classed("selected", true);
    }
    tagSentence(i, tag){
        if (tag == 'default') {
            this.selected_sentence = i;
            if (!(i in this.sentence_tags)) { this.sentence_tags[i] = new Set([]); }
            this.switchToSentenceTags();
            displaySentenceTags(i);
        } else {
            if (this.tag_sentences[tag] != null && this.tag_sentences[tag].has(i)) {
                alert("tag already present for this sentence");
            } else {
                d3.select("#sentence_"+i).classed("selected", true);
                if (!(i in this.sentence_tags)) { this.sentence_tags[i] = new Set([]); }
                this.sentence_tags[i].add(tag);
                if (!(tag in this.tag_sentences)) { this.tag_sentences[tag] = new Set([]); }
                this.tag_sentences[tag].add(i);
                displayTokenizedSummary();
            }
        }
    }
    untagSentence(i, tag) {
        d3.select("#summary_sentence_"+tag+"_"+i).remove();
        this.sentence_tags[i].delete(tag);
        if (this.sentence_tags[i].size == 0) {
            d3.select("#sentence_"+i).classed("selected", false);
            d3.select("#sentence_"+i+"_tags").remove();
            delete this.sentence_tags[i];
        }
        this.tag_sentences[tag].delete(i);
        if (this.tag_sentences[tag].size == 0) {
            d3.select("#tag_"+tag).remove();
            delete this.tag_sentences[tag];
        }
    }
    //create remove sentence
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

function populateTagSelector(tag_selector, default_option="Select a Tag") {
    tag_selector.html("");
    tag_selector.append("option")
      .attr("value", "default")
      .html(default_option)
      .attr("disabled", true);
    tag_selector.selectAll(".tags")
      .data(Object.keys(queries))
      .enter()
      .append("option")
        .attr("value", function(d) { return d; })
        .html(function(d) { return d + ": " + queries[d]; });
    $("#"+tag_selector.attr("id")).selectpicker('refresh');
}

function boldItems(selector, indices) {
    selector.classed("bold", function(d, i) { return indices; })
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
            closeLoader(d3.select("#loader_div"));
        },
        processData: false,
        contentType: false,
    });
}

function chooseTag() {
    displayTag();
}

function displayTag() {
    state.switchToTagSentences();
    var tag_selector = document.getElementById("tag");
    var tag = tag_selector.options[tag_selector.selectedIndex].value;
    d3.selectAll(".summary_p")
      .classed("selected", function(d) { return d == tag; });
}

function addSentenceTag() {
    var tag_selector = document.getElementById("sentence_tag");
    var tag = tag_selector.options[tag_selector.selectedIndex].value;
    state.tagSentence(state.selected_sentence, tag);
    displaySentenceTags(state.selected_sentence);
    state.switchToSentenceTags();
}

function showAllSummaries() {
    state.switchToTagSentences();
    d3.select("#summary_div").select(".custom_text").selectAll(".summary_p")
      .classed("selected", true);
    document.getElementById("tag").selectedIndex = 0;
    $("#tag").selectpicker('refresh');
}

function populateReportSelector() {
    state.report_idxs = {};
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
        .on("click", function(d, i) {
          d3.select(this).interrupt("highlightMomentarily");
          var tag_selector = document.getElementById("tag");
          var tag = tag_selector.options[tag_selector.selectedIndex].value;
          state.tagSentence(d[1][0], tag); })
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
    tag_sentences_div = d3.select("#tag_sentences");
    tag_sentences_div.html("");
    summary_p = tag_sentences_div.selectAll("p")
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
        .each(displayTokenizedSentence);
    sentence_p.append("button")
      .attr("class", "btn btn-outline-danger btn-sm")
      .on("click", function(d){ state.untagSentence(d[1], d[0]); })
      .html("<span aria-hidden=\"true\">&times;</span>");
    displayTag();
}

function displaySentenceTags(i) {
    sentence_tags = d3.select("#sentence_tags");
    sentence_header = sentence_tags.select("#sentenceheader").selectAll("div").data(current_result.tokenized_text[i]);
    sentence_header.exit().remove();
    sentence_header.enter().append("div").style("display", "inline").each(displayTokenizedSentence);
    sentence_header.each(displayTokenizedSentence);
    sentence_tags.select(".custom_text").html("");
    console.log(state.sentence_tags[i]);
    sentence_tags.select(".custom_text").selectAll("p")
      .data(Array.from(state.sentence_tags[i]).map(function(e){ return [i, e]; }))
      .enter()
      .append("p")
        .attr("class", "sentence_tag")
        .attr("id", function(d) { return "sentence_tag_"+d[0]+"_"+d[1]; })
        .attr("tag", function(d) { return d[1]; })
        .attr("sentence", function(d) { return d[0]; })
        .html(function(d) { console.log(d);return d[1] + ": " + queries[d[1]]; });
    populateTagSelector(d3.select("#sentence_tag"), "Add a Tag to this Sentence");
}

function displayTokenizedSentence(d, i) {
    d3.select(this).html("");
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
      .html(word);
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
