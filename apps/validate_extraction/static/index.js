var current_result = null;
var state = null;
$(document).ready(function(){
    state = new State(queries)
    if (file_from_server) {
        loadArticle();
    }
    $("#heatmap").attr("disabled", true);
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

function getFile(callback) {
   url = 'http://localhost:5000/get_file/'+file;
   $.get(url, callback);
}

function loadArticle() {
    var article = d3.select("body").select("#article_div").select("p");
    if (file_from_server) {
        console.log(file_from_server);
        // read in file here
        if (file == "False") {
            d3.select("body").html("Done!");
        } else {
            getFile(function(data, status, request){
                console.log(request);
                console.log(request.getResponseHeader('filename'));
                d3.select("#article_file").html(request.getResponseHeader('filename'));
                article.html(data);
                state.enableQuery();
            });
        }
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

function executeQuery() {
    url = 'http://localhost:5000/query'
    var formData = new FormData();
    var query_selector = document.getElementById("query");
    if (query_selector.options[query_selector.selectedIndex].value == 'default') { alert("no query selected"); return; }
    formData.append("query", query_selector.options[query_selector.selectedIndex].value);
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
            displayHeatmap();
            closeLoader(d3.select("body").select("#loader_div"));
        },
        processData: false,
        contentType: false,
    });
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
    populateHeatmapSelector(current_result.heatmaps);
    changeHeatmap();
}

function changeHeatmap() {
    var heatmap_selector = document.getElementById("heatmap");
    var heatmap = heatmap_selector.options[heatmap_selector.selectedIndex].value
    console.log(heatmap)
    var article = d3.select("body").select("#article_div").select("p");
    article.html("");
    article.selectAll("p")
      .data(current_result.heatmaps[heatmap].map(function(e, i) { return [e, current_result.tokenized_text[i]]; }))
      .enter()
      .append("p")
        .attr("id", function(d, i) { return "sentence_"+i; })
        .selectAll("text")
        .data(function(d) { return d[0].map(function(e, i) { return [e, d[1][i]]; }); })
        .enter()
        .append("div")
          .style("display", "inline")
          .each(function(d, i) {
            var word = d[1];
            if (i > 0 && !word.startsWith('##')) {
                d3.select(this).append("text").html(' ');
            } else {
                if (word.startsWith('##')) {
                    word = word.slice(2);
                }
            }
            d3.select(this).append("text")
              .attr("style", function(d) { return 'display:inline; background-color:' + toColor(d[0], greenhue); })
              .html(word); });
    displayExtracted();
}

function displayExtracted(){
    var heatmap_selector = document.getElementById("heatmap");
    var heatmap = heatmap_selector.options[heatmap_selector.selectedIndex].value;
    console.log(heatmap);
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
        .each(function(d) { d3.select("body").select("#article_div").select("p").select("#sentence_"+d[0]).style("background-color", "yellow"); })
        .on("click", function(d) { d3.select("body").select("#article_div").select("p").select("#sentence_"+d[0]).node().scrollIntoView({block: "center"}); })
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
              .attr("style", function(d) { return 'display:inline;'; })
              .html(word); });
    summary_sentence_div
      .append("select")
        .selectAll("option")
        .data(["rate",1,2,3,4,5])
        .enter()
        .append("option")
          .attr("value", function(d) { return d; })
          .html(function(d) { return d; });
}

function populateHeatmapSelector(heatmaps) {
    heatmap = d3.select("body").select("#heatmap");
    heatmap.html("");
    for (var key in heatmaps) {
        if (heatmaps.hasOwnProperty(key)) {
            console.log(key + " -> " + heatmaps[key]);
            heatmap.append("option")
                .attr("value", key)
                .html(key);
        }
    }
}

function displayLoader(selection) {
    selection.append("div")
        .attr("class", "loader");
}

function closeLoader(selection) {
    console.log("removing loader");
    selection.selectAll(".loader").remove();
}

function submit() {
    url = 'http://localhost:5000'
    var formData = new FormData();
    formData.append("hello", "world");
    console.log(formData);
    $.post({
        url: url,
        data: formData,
        success: function(result, status){
            console.log(result);
            console.log(status);
            location.reload(true);
        },
        processData: false,
        contentType: false,
    });
}
