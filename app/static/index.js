$(document).ready(function(){
    populateQuerySelector(queries);
    $('.fancy_select').select2();
    $("#query").attr("disabled", true);
    if (file != "") {
        loadArticle();
    }
});

function loadArticle() {
    if (file != "") {
        console.log(file);
        $("#query").attr("disabled", false);
    } else {
        var x = document.getElementById("article_file");
        var article = d3.select("body").select("#article_div").select("p");
        article.html("");
        if (x.files.length == 0) {
            $("#query").attr("disabled", true);
            alert("Select a file.");
        } else {
            read = new FileReader();
            read.readAsText(x.files[0]);
            read.onloadend = function(){
                article.html(read.result);
            }
            $("#query").attr("disabled", false);
        }
        event.preventDefault();
    }
}

function populateQuerySelector(queries) {
    for (var key in queries) {
        if (queries.hasOwnProperty(key)) {
            console.log(key + " -> " + queries[key]);
            d3.select("body")
              .select("#query")
              .append("option")
                .attr("value", key)
                .html(key)
        }
    }
}

function executeQuery() {
    url = 'http://localhost:5000'
    var formData = new FormData();
    formData.append("query", "('ICD9', '76382')");
    var x = document.getElementById("article_file");
    formData.append("article", x.files[0]);
    console.log(formData);
    $.post({
        url: url,
        data: formData,
        success: function(result, status){
            console.log(result);
            console.log(status);
            displayHeatmap(result);
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


function displayHeatmap(result) {
    var heatmap = "attention";
    var article = d3.select("body").select("#article_div").select("p");
    article.html("");
    for (var i=0; i<result.tokenized_text.length; i++) {
        for (var j=0; j<result.tokenized_text[i].length; j++) {
            var word = result.tokenized_text[i][j];
            console.log(word);
            if (j>0 && !word.startsWith('##')) {
                article.append("text").html(' ');
            } else {
                if (word.startsWith('##')) {
                    word = word.slice(2);
                } else {
                    article.append("text").html('<br>');
                }
            }
            var style = 'display:inline; background-color:' + toColor(result.heatmaps[heatmap][i][j], greenhue);
            article.append("text").html(word)
              .attr('style', style);
        }
    }
}
