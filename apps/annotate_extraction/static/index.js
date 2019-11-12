var current_result = null;
var state = null;
$(document).ready(function(){
    state = new State(queries)
    if (file_from_server) {
        loadArticle();
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
        displaySummary(selected_sentences);
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

function loadArticle() {
    var article = d3.select("body").select("#article_div").select("p");
    if (file_from_server) {
        console.log(file_from_server);
        // read in file here
        // print file here
        article.html("article here");
        state.enableQuery()
    } else {
        var x = document.getElementById("article_file");
        article.html("");
        if (x.files.length == 0) {
            state.disableQuery()
            populateHeatmapSelector({});
            alert("Select a file.");
        } else {
            read = new FileReader();
            read.readAsText(x.files[0]);
            read.onloadend = function(){
                article.html(read.result);
            }
            state.enableQuery()
        }
        event.preventDefault();
    }
    tokenizeArticle();
}

function populateQuerySelector(queries) {
    d3.select("body")
      .select("#query")
      .append("option")
        .attr("value", "default")
        .html("Select a Query");
    for (var key in queries) {
        if (queries.hasOwnProperty(key)) {
            console.log(key + " -> " + queries[key]);
            d3.select("body")
              .select("#query")
              .append("option")
                .attr("value", key)
                .html(key + ": " + queries[key]);
        }
    }
}

function tokenizeArticle() {
    url = 'http://localhost:5000'
    var formData = new FormData();
    if (!file_from_server) {
        var x = document.getElementById("article_file");
        formData.append("article", x.files[0]);
    }
    console.log(formData);
    displayLoader(d3.select("body").select("#loader_div"));
    $.post({
        url: url,
        data: formData,
        success: function(result, status){
            console.log(result);
            console.log(status);
            current_result = result;
            displayArticle();
            closeLoader(d3.select("body").select("#loader_div"));
        },
        processData: false,
        contentType: false,
    });
}

function executeQuery() {
    var query_selector = document.getElementById("query");
    if (query_selector.options[query_selector.selectedIndex].value == 'default') {
        alert("no query selected");
    }
}

function displayArticle() {
    var article = d3.select("body").select("#article_div").select("p");
    article.html("");
    article.selectAll("p")
      .data(current_result.tokenized_text)
      .enter()
      .append("p")
        .attr("id", function(d, i) { return "sentence_"+i; })
        .attr("selected", "false")
        .attr("class", "article_sentence")
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

function displaySummary(data) {
    var summary = d3.select("body").select("#summary_div").select("p");
    summary.html("");
    summary.selectAll("p")
      .data(data)
      .enter()
      .append("p")
        .attr("id", function(d) { return "summary_sentence_"+d; })
        .attr("class", "summary_sentence")
        .on("click", function(d) { d3.select("#sentence_"+d).node().scrollIntoView({block: "center"}); })
        .selectAll("text")
        .data(function(d) { return d3.select("#sentence_"+d).node().__data__; })
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
    console.log("removing loader");
    selection.selectAll(".loader").remove();
}
